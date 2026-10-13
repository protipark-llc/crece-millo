/**
 * Persistencia del Co-Piloto por usuario, con la forma del estado `S` del original.
 *
 * - loadState: devuelve S. La primera vez lo crea: con los datos del Co-Piloto anterior si la
 *   persona tenía productos (se conservan valores, tests y avance), o con los 6 productos por
 *   defecto del original.
 * - Cambios puntuales (producto, test, supuestos, planes): una fila por cambio.
 * - importState / resetState reemplazan todo dentro de la misma transacción.
 *
 * Todo corre dentro de withUser (RLS); los filtros por user_id se mantienen igual.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { selectBatch } from "@/lib/db/batch";
import {
  copilotPlans,
  copilotProducts,
  copilotTests,
  copilotoProductState,
  copilotoProducts,
  copilotoSaved,
  copilotoSettings,
  copilotoTests,
  dropshipProgress,
} from "@/lib/db/schema";
import { CURRENCIES } from "@/lib/money/currency";
import { E } from "@/lib/copiloto/engine";
import { pcDefaults } from "@/lib/copiloto/logic";
import { defaultState, withDefaults, type CopilotState, type Product, type Saved, type Test } from "@/lib/copiloto/state";
import { analyzePrice } from "@/lib/copilot/engine";
import { pricingInput as legacyPricingInput } from "./copilot";
import { UserFacingError } from "./errors";

type Origin = "default" | "legacy" | "import";

/* ───────────── Lectura ───────────── */

export async function loadState(tx: Tx, userId: string, today: string): Promise<CopilotState> {
  const b = await selectBatch(tx, {
    settings: [copilotoSettings, tx.select().from(copilotoSettings).where(eq(copilotoSettings.userId, userId))],
    products: [copilotoProducts, tx.select().from(copilotoProducts).where(eq(copilotoProducts.userId, userId)).orderBy(asc(copilotoProducts.position))],
    // El original agrega cada test nuevo al principio (unshift): orden del más reciente al más antiguo.
    tests: [copilotoTests, tx.select().from(copilotoTests).where(eq(copilotoTests.userId, userId))],
    state: [copilotoProductState, tx.select().from(copilotoProductState).where(eq(copilotoProductState.userId, userId))],
    saved: [copilotoSaved, tx.select().from(copilotoSaved).where(eq(copilotoSaved.userId, userId))],
  });
  const s = b.settings[0];
  if (!s) {
    // Primera visita: un candado por persona evita que dos pestañas creen el estado a la vez.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"copiloto:" + userId}))`);
    const [again] = await tx.select({ userId: copilotoSettings.userId }).from(copilotoSettings).where(eq(copilotoSettings.userId, userId));
    if (again) return loadState(tx, userId, today);
    const legacy = await legacyState(tx, userId, today);
    const initial = legacy ?? defaultState(today);
    await writeState(tx, userId, initial, legacy ? "legacy" : "default");
    return stripOrigin(initial);
  }
  const byTsDesc = <T extends { ts: number }>(a: T, c: T) => c.ts - a.ts;
  const pc: CopilotState["pc"] = {};
  const mk: CopilotState["mk"] = {};
  for (const r of b.state) (r.kind === "pc" ? pc : mk)[r.productId] = r.data;
  const products = b.products.map((r) => r.data as unknown as Product);
  return {
    v: 4,
    tab: s.tab,
    ptab: s.ptab,
    pf: s.pf as CopilotState["pf"],
    risk: s.risk,
    cur: s.cur as CopilotState["cur"],
    trm: s.trm,
    active: products.some((p) => p.id === s.active) ? s.active : (products[0]?.id ?? s.active),
    marca: s.marca,
    products,
    tests: b.tests.map((r) => r.data as unknown as Test).sort(byTsDesc),
    plans: b.saved.filter((r) => r.kind === "plan").map((r) => r.data as unknown as Saved).sort(byTsDesc),
    sims: b.saved.filter((r) => r.kind === "sim").map((r) => r.data as unknown as Saved).sort(byTsDesc),
    checks: s.checks,
    testForm: s.testForm,
    planForm: s.planForm,
    simForm: s.simForm,
    pc,
    mk,
  };
}

function stripOrigin(S: CopilotState): CopilotState {
  const { _origin: _, ...rest } = S as CopilotState & { _origin?: Origin };
  return rest as CopilotState;
}

/* ───────────── Escritura completa (inicio, importación, borrar todo) ───────────── */

export async function writeState(tx: Tx, userId: string, input: CopilotState, origin: Origin) {
  const S = stripOrigin(input);
  for (const t of [copilotoProducts, copilotoTests, copilotoProductState, copilotoSaved]) await tx.delete(t).where(eq(t.userId, userId));
  const settings = {
    risk: Math.round(S.risk),
    cur: S.cur,
    trm: S.trm,
    active: S.active,
    marca: S.marca ?? "",
    tab: S.tab ?? "ruta",
    ptab: S.ptab ?? "ficha",
    pf: S.pf,
    checks: S.checks ?? {},
    testForm: S.testForm,
    planForm: S.planForm,
    simForm: S.simForm,
    origin,
  };
  await tx.insert(copilotoSettings).values({ userId, ...settings }).onConflictDoUpdate({ target: copilotoSettings.userId, set: settings });
  if (S.products.length) await tx.insert(copilotoProducts).values(S.products.map((p, i) => ({ userId, id: p.id, position: i, data: p as Record<string, unknown> })));
  if (S.tests.length) await tx.insert(copilotoTests).values(S.tests.map((t) => ({ userId, id: t.id, productId: t.productId ?? null, ts: t.ts, data: t as unknown as Record<string, unknown> })));
  const state = [
    ...Object.entries(S.pc ?? {}).map(([productId, data]) => ({ userId, productId, kind: "pc", data })),
    ...Object.entries(S.mk ?? {}).map(([productId, data]) => ({ userId, productId, kind: "mk", data })),
  ];
  if (state.length) await tx.insert(copilotoProductState).values(state);
  const saved = [...S.plans.map((x) => ({ x, kind: "plan" })), ...S.sims.map((x) => ({ x, kind: "sim" }))];
  if (saved.length) await tx.insert(copilotoSaved).values(saved.map(({ x, kind }) => ({ userId, id: x.id, kind, ts: x.ts, data: x as unknown as Record<string, unknown> })));
}

/** Importar respaldo (ya validado con parseBackup). Reemplaza todo. */
export async function importState(tx: Tx, userId: string, S: CopilotState) {
  await writeState(tx, userId, S, "import");
}

/** «Borrar todo» (resetAll): vuelve al estado inicial del original. */
export async function resetState(tx: Tx, userId: string, today: string) {
  await writeState(tx, userId, defaultState(today), "default");
}

/* ───────────── Cambios puntuales ───────────── */

export type SettingsPatch = Partial<Pick<CopilotState, "risk" | "cur" | "trm" | "active" | "marca" | "tab" | "ptab" | "pf" | "checks" | "testForm" | "planForm" | "simForm">>;

export async function saveSettings(tx: Tx, userId: string, patch: SettingsPatch) {
  if (Object.keys(patch).length === 0) return;
  await tx.update(copilotoSettings).set(patch).where(eq(copilotoSettings.userId, userId));
}

/** Crea o reemplaza un producto. Si es nuevo, va al final de la lista. */
export async function putProduct(tx: Tx, userId: string, p: Product) {
  const [existing] = await tx
    .select({ position: copilotoProducts.position })
    .from(copilotoProducts)
    .where(and(eq(copilotoProducts.userId, userId), eq(copilotoProducts.id, p.id)));
  if (existing) {
    await tx
      .update(copilotoProducts)
      .set({ data: p as Record<string, unknown> })
      .where(and(eq(copilotoProducts.userId, userId), eq(copilotoProducts.id, p.id)));
    return;
  }
  const all = await tx.select({ position: copilotoProducts.position }).from(copilotoProducts).where(eq(copilotoProducts.userId, userId));
  const position = all.reduce((m, r) => Math.max(m, r.position + 1), 0);
  await tx.insert(copilotoProducts).values({ userId, id: p.id, position, data: p as Record<string, unknown> });
}

/** Elimina un producto (no el último, como el original). Sus tests se quedan en la bitácora. */
export async function removeProduct(tx: Tx, userId: string, id: string) {
  const all = await tx.select({ id: copilotoProducts.id }).from(copilotoProducts).where(eq(copilotoProducts.userId, userId)).orderBy(asc(copilotoProducts.position));
  if (all.length <= 1) throw new UserFacingError("No puedes eliminar tu único producto.");
  await tx.delete(copilotoProducts).where(and(eq(copilotoProducts.userId, userId), eq(copilotoProducts.id, id)));
  await tx.delete(copilotoProductState).where(and(eq(copilotoProductState.userId, userId), eq(copilotoProductState.productId, id)));
  const next = all.find((r) => r.id !== id)!.id;
  await tx.update(copilotoSettings).set({ active: next }).where(and(eq(copilotoSettings.userId, userId), eq(copilotoSettings.active, id)));
}

export async function putTest(tx: Tx, userId: string, t: Test) {
  const row = { productId: t.productId ?? null, ts: t.ts, data: t as unknown as Record<string, unknown> };
  await tx
    .insert(copilotoTests)
    .values({ userId, id: t.id, ...row })
    .onConflictDoUpdate({ target: [copilotoTests.userId, copilotoTests.id], set: row });
}

export async function removeTest(tx: Tx, userId: string, id: string) {
  await tx.delete(copilotoTests).where(and(eq(copilotoTests.userId, userId), eq(copilotoTests.id, id)));
}

/** Supuestos de precio (pc) o marketing (mk) de un producto; null los borra («Restablecer»). */
export async function putProductState(tx: Tx, userId: string, productId: string, kind: "pc" | "mk", data: Record<string, unknown> | null) {
  const where = and(eq(copilotoProductState.userId, userId), eq(copilotoProductState.productId, productId), eq(copilotoProductState.kind, kind));
  if (data === null) {
    await tx.delete(copilotoProductState).where(where);
    return;
  }
  await tx
    .insert(copilotoProductState)
    .values({ userId, productId, kind, data })
    .onConflictDoUpdate({ target: [copilotoProductState.userId, copilotoProductState.productId, copilotoProductState.kind], set: { data } });
}

export async function putSaved(tx: Tx, userId: string, kind: "plan" | "sim", item: Saved) {
  await tx.insert(copilotoSaved).values({ userId, id: item.id, kind, ts: item.ts, data: item as unknown as Record<string, unknown> });
}

export async function removeSaved(tx: Tx, userId: string, id: string) {
  await tx.delete(copilotoSaved).where(and(eq(copilotoSaved.userId, userId), eq(copilotoSaved.id, id)));
}

/* ───────────── Migración desde el Co-Piloto anterior ───────────── */

const ETAPA_FROM_STATUS: Record<string, string> = { idea: "Idea", prueba: "En test", ganador: "Ganador", pausado: "Pausado", descartado: "Descartado" };

/** Casillas de la ruta anterior (23 pasos propios) con equivalente claro en las 25 del original. */
const LEGACY_CHECKS: Record<string, string> = {
  "f1-capital": "f0b",
  "f3-politicas": "f2a",
  "f3-pagina": "f2b",
  "f3-confirmacion": "f2c",
  "f4-creativos": "f2e",
  "f4-lanzar": "f3a",
  "f4-veredicto": "f3c",
  "f6-escalar": "f4c",
  "f6-segundo": "f5c",
};

/**
 * Convierte lo que la persona tenía en el Co-Piloto anterior (copilot_products, copilot_tests,
 * copilot_plans, dropship_progress) al estado del original. Null si no tenía productos.
 *
 * - Importes: de centavos a pesos. Precio: el que eligió o, si no eligió, el recomendado que
 *   le mostraba la versión anterior.
 * - Costos: «otros costos» → empaque; comisiones de recaudo + plataforma → com;
 *   devoluciones → % de entrega = 100 − devoluciones; sin cancelaciones → confirmación 100 %.
 * - Su CPA esperado pasa a ser el CPA de referencia de Precio y margen.
 * - Cada test se recalcula con el motor del original (E.test y E.verdict, riesgo 5).
 */
export async function legacyState(tx: Tx, userId: string, today: string): Promise<(CopilotState & { _origin: Origin }) | null> {
  const old = await selectBatch(tx, {
    products: [copilotProducts, tx.select().from(copilotProducts).where(eq(copilotProducts.userId, userId)).orderBy(asc(copilotProducts.createdAt))],
    tests: [copilotTests, tx.select().from(copilotTests).where(eq(copilotTests.userId, userId)).orderBy(asc(copilotTests.createdAt))],
    plans: [copilotPlans, tx.select().from(copilotPlans).where(eq(copilotPlans.userId, userId))],
    progress: [dropshipProgress, tx.select().from(dropshipProgress).where(eq(dropshipProgress.userId, userId))],
  });
  if (old.products.length === 0) return null;
  const S = defaultState(today);
  const unit = (cur: string) => 10 ** (CURRENCIES[cur as keyof typeof CURRENCIES]?.exponent ?? 2);
  const ids = new Map<string, string>();
  const used = new Set<string>();

  S.products = old.products.map((o) => {
    const u = unit(o.currency);
    let id = `p${o.createdAt.getTime()}`;
    while (used.has(id)) id = `p${Number(id.slice(1)) + 1}`;
    used.add(id);
    ids.set(o.id, id);
    const recommended = analyzePrice(legacyPricingInput(o), o.currency).recommendedPrice;
    const price = o.salePrice ?? recommended ?? 0;
    return withDefaults(
      {
        id,
        nombre: o.name,
        etapa: ETAPA_FROM_STATUS[o.status] ?? "Investigando",
        proveedor: o.supplier || "Dropi",
        notas: o.notes ?? "",
        fecha: o.createdAt.toISOString().slice(0, 10),
        costo: Math.round(o.productCost / u),
        precio: Math.round(price / u),
        flete: Math.round(o.shippingCost / u),
        fleteRet: Math.round(o.returnShippingCost / u),
        entrega: Math.round(100 - o.returnRateBps / 100),
        com: (o.paymentFeeBps + o.platformFeeBps) / 100,
        imp: 0,
        conf: 100,
        empaque: Math.round(o.otherCosts / u),
        costoConf: 0,
        meta: o.targetMarginBps / 100,
        costoReal: true,
        legacy: { origen: "Co-Piloto anterior", cpaEsperado: Math.round(o.expectedCpa / u), precioElegido: o.salePrice !== null, moneda: o.currency },
      },
      today,
    );
  });
  S.active = S.products.find((p) => /Ganador|En test/.test(p.etapa))?.id ?? S.products[0]!.id;

  const byOld = new Map(old.products.map((o) => [o.id, o]));
  S.tests = old.tests
    .filter((t) => ids.has(t.productId))
    .map((t, i) => {
      const p = S.products.find((x) => x.id === ids.get(t.productId))!;
      const u = unit(byOld.get(t.productId)!.currency);
      const meta = (p.meta as number) || 20;
      const form = {
        nombre: t.notes || `${t.channel || "Test"} ${t.startedOn}`,
        fecha: t.startedOn,
        canal: t.channel ?? "",
        dias: t.days,
        ads: Math.round(t.adSpend / u),
        imp: 0,
        clics: 0,
        ped: t.orders,
        conf: null,
        ent: null,
        aov: 0,
        notas: t.notes ?? "",
        meta,
      };
      const c = E.test(form, p);
      const v = E.verdict(c, meta, S.risk, p);
      return {
        id: `t${t.createdAt.getTime() + i}`,
        ts: Date.parse(`${t.startedOn}T12:00:00`) || t.createdAt.getTime(),
        risk: S.risk,
        productId: p.id,
        producto: p.nombre,
        form,
        c: c as unknown as Record<string, unknown>,
        verdict: v.label,
        meta,
      } as Test;
    })
    .reverse();

  // Su CPA esperado entra como CPA de referencia en Precio y margen (si lo había puesto).
  for (const p of S.products) {
    const cpa = (p.legacy as { cpaEsperado: number }).cpaEsperado;
    if (cpa > 0) S.pc[p.id] = { ...pcDefaults(S, p), cpa0: Math.round(cpa / 100) * 100 };
  }

  const plan = old.plans[0];
  if (plan) {
    const u = unit(plan.currency);
    const cap = Math.round(plan.capital / u);
    const fijos = Math.round(plan.monthlyFixed / u);
    S.planForm = { ...S.planForm, cap, ...(fijos > 0 ? { fijos } : {}) };
    S.simForm = { ...S.simForm, cap, ...(fijos > 0 ? { fijos } : {}) };
  }

  for (const r of old.progress) {
    const k = LEGACY_CHECKS[r.stepKey];
    if (k) S.checks[k] = true;
  }
  return { ...S, _origin: "legacy" };
}
