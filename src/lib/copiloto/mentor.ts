/**
 * Mentor con IA (BASE, ctx, askMentor y las 7 acciones; L775, L958–961, L1036, L1150–1170 del original).
 * Los prompts son los del original; los arma el servidor con el estado guardado de la persona,
 * así la ruta no acepta texto libre. La respuesta se valida con estos esquemas antes de pintarla.
 */
import { z } from "zod";
import { E, type TestResult } from "./engine";
import { activeProduct, prodTests } from "./logic";
import { angles, mkCtx, mkState } from "./marketing";
import { CATS, type CopilotState, type Product } from "./state";
import { diagnoseEsCO } from "./format";

export interface Fmt {
  money: (n: number) => string;
  pct: (n: number) => string;
  x: (n: number) => string;
}

export const MENTOR_BASE =
  "Eres el mentor del Método Trendo: experto en e-commerce y dropshipping contraentrega en Colombia (Shopify + Dropi). Usas terminología técnica (ROAS, CPA, AOV, margen de contribución, % de entrega) pero explicas claro y directo, en español. Contexto: en contraentrega el capital propio financia la pauta, Dropi liquida días después de la entrega y en cada devolución se pierde el flete. Nunca prometas rentabilidad; esto es apoyo educativo, no asesoría financiera.";

/** Contexto del negocio (ctx, L1151). */
export function mentorCtx(S: CopilotState, f: Fmt): string {
  const p = activeProduct(S),
    g = E.gate(p, S.risk),
    rp = E.riskProfile(S.risk),
    real = E.real(S.tests);
  return `Nivel de riesgo: ${S.risk}/10 (${rp.label}); reglas: holgura exigida sobre CPA máximo ${f.pct(g.R.holguraCPA)}, corte sin ventas ${g.R.killMult.toFixed(1)}× CPA máximo, subida de presupuesto ${g.R.subida}% cada 2–3 días.
Producto activo: ${p.nombre}. Costo ${f.money(p.costo)}, precio ${f.money(p.precio)}, flete ${f.money(p.flete as number)}, % entrega esperado ${p.entrega}%, comisión ${p.com}%. Utilidad por pedido ${f.money(g.u.utilidadPedido)} (= CPA máximo), CPA objetivo ${f.money(g.cpaObj)}, ROAS mínimo ${f.x(g.u.roasMin)}. ${g.pass ? "Pasa" : "No pasa"} la validación.
${real ? `Datos reales de ${real.n} test(s): ROAS ${f.x(real.roas)}, CPA ${f.money(real.cpa)}, % entrega ${f.pct(real.entrega)}, margen de contribución ${f.pct(real.cm)}, utilidad neta acumulada ${f.money(real.neta)}.` : "Aún no hay tests reales guardados."}`;
}

const s = z.string();
const offer = z.object({ nombre: s, precio: s, por_que: s, mensaje: s });

export const MENTOR_SCHEMAS = {
  producto: z.object({
    estado: s,
    diagnostico: s,
    estrategia: z.array(s),
    creativos: s,
    pagina_oferta: s,
    logistica: s,
    presupuesto: s,
    siguiente_paso: s,
  }),
  ofertas: z.object({
    upsells: z.array(offer),
    downsells: z.array(offer),
    cross_sells: z.array(offer),
  }),
  creativos: z.object({
    ganchos: z.array(s),
    guiones: z.array(z.object({ titulo: s, duracion: s, escenas: z.array(s) })),
    textos: z.array(s),
    titulares: z.array(s),
  }),
  alta: z.object({
    nombre_corto: s,
    categoria: s,
    publico: s,
    beneficio: s,
    dolor: s,
    angulos: z.array(s),
    objeciones: z.array(s),
    invima: s,
    score: z.object(
      Object.fromEntries(E.CRIT.map(([k]) => [k, z.number()])) as Record<
        string,
        z.ZodNumber
      >,
    ),
  }),
  test: z.object({
    veredicto: s,
    diagnostico: s,
    acciones: z.array(s),
    ajuste_ads: s,
    foco_ux: s,
    riesgo: s,
    siguiente_paso: s,
  }),
  plan: z.object({
    proposito: s,
    propuesta_capital: s,
    proximos_pasos: z.array(s),
    justificacion_riesgo: s,
    advertencia: s,
  }),
  semanal: z.object({
    resumen: s,
    escalar: z.array(s),
    optimizar: z.array(s),
    matar: z.array(s),
    siguiente_test: s,
    capital_semana: s,
    foco_semana: z.array(s),
  }),
};
export type MentorAction = keyof typeof MENTOR_SCHEMAS;
export type MentorResult<A extends MentorAction> = z.infer<
  (typeof MENTOR_SCHEMAS)[A]
>;
export const MENTOR_ACTIONS = Object.keys(MENTOR_SCHEMAS) as MentorAction[];

/** Forma JSON que pide el original al final de cada prompt. */
const SHAPE: Record<MentorAction, string> = {
  producto: `{"estado":"","diagnostico":"","estrategia":["","",""],"creativos":"","pagina_oferta":"","logistica":"","presupuesto":"","siguiente_paso":""}`,
  ofertas: `{"upsells":[{"nombre":"","precio":"","por_que":"","mensaje":""}],"downsells":[{"nombre":"","precio":"","por_que":"","mensaje":""}],"cross_sells":[{"nombre":"","precio":"","por_que":"","mensaje":""}]}`,
  creativos: `{"ganchos":[""],"guiones":[{"titulo":"","duracion":"","escenas":[""]}],"textos":[""],"titulares":[""]}`,
  alta: "",
  test: `{"veredicto":"","diagnostico":"","acciones":["",""],"ajuste_ads":"","foco_ux":"","riesgo":"","siguiente_paso":""}`,
  plan: `{"proposito":"","propuesta_capital":"","proximos_pasos":["","",""],"justificacion_riesgo":"","advertencia":""}`,
  semanal: `{"resumen":"","escalar":[""],"optimizar":[""],"matar":[""],"siguiente_test":"","capital_semana":"","foco_semana":["","",""]}`,
};

function mkPromptCtx(S: CopilotState, f: Fmt) {
  const c = mkCtx(activeProduct(S), f.money),
    p = c.p;
  return `Producto: ${c.n}. Categoría: ${c.cat}. Sub-nicho: ${p.subnicho}. Público: ${c.pub}. Beneficio: ${c.ben}. Problema: ${c.dol}. Ángulos: ${c.angs.join(" | ") || "—"}. Objeciones: ${c.objs.join(" | ") || "—"}. Precio ${f.money(p.precio)}${(p.ancla as number) > p.precio ? `, tachado ${f.money(p.ancla as number)}` : ""}. Costo ${f.money(p.costo)}. Venta por contraentrega en Colombia con Dropi.`;
}

export interface MentorInput {
  testForm?: Record<string, unknown>;
  planForm?: Record<string, unknown>;
  draft?: Product;
}

const n = (v: unknown) => {
  const x = parseFloat(String(v ?? ""));
  return isNaN(x) ? 0 : x;
};

/** Texto de la acción (sin BASE ni ctx). */
function actionPrompt(
  a: MentorAction,
  S: CopilotState,
  i: MentorInput,
  f: Fmt,
): string {
  const p = activeProduct(S);
  if (a === "producto") {
    const ev = E.evaluate(p, S.risk);
    const A = E.agg(prodTests(S, p.id));
    const v = A ? E.verdict(A, (p.meta as number) || 20, S.risk, p) : null;
    const D = A ? diagnoseEsCO(A, p, S.risk, { cur: S.cur, trm: S.trm }) : [];
    return `Diseña la estrategia para el producto "${p.nombre}" (${p.categoria} · ${p.subnicho}), etapa ${p.etapa}. Público: ${p.publico || "—"}. Ángulos: ${p.angulos || "—"}. Objeciones: ${p.objeciones || "—"}. Competencia: ${p.competidores || 0} tiendas, precio promedio ${f.money(p.precioComp as number)}. Precio ${f.money(p.precio)} (tachado ${f.money(p.ancla as number)}), upsell ${(p.upTasa as number) > 0 ? f.money(p.upPrecio as number) + " con " + p.upTasa + "% de adopción" : "no tiene"}. Evaluación inicial ${ev.total}/100, clase ${ev.clase}. ${
      A && v
        ? `Resultados acumulados (${A.n} registros): gasto ${f.money(A.ads)}, impresiones ${A.imp}, clics ${A.clics}, CTR ${A.ctr == null ? "—" : f.pct(A.ctr)}, pedidos ${A.ped}, confirmación ${f.pct(A.tasaConf)}, entrega ${f.pct(A.tasaEntrega)}, AOV ${f.money(A.aov)}, ROAS ${f.x(A.roas)} (equilibrio ${f.x(A.roasEq)}), CPA ${f.money(A.cpa)}, utilidad neta ${f.money(A.neta)}. Veredicto del modelo: ${v.label}. Diagnóstico: ${D.map((d) => d[1] + ": " + d[2]).join(" | ")}.`
        : "Aún no hay resultados de venta: enfócate en cómo lanzarlo."
    }`;
  }
  if (a === "ofertas")
    return `Crea ofertas para subir el ticket y rescatar ventas. ${mkPromptCtx(S, f)} Propón upsells (complementos reales que existan en Dropi), combos, un order bump, downsells para quien duda y cross-sells posventa. Para cada uno: nombre, precio sugerido en COP, por qué funciona y el mensaje exacto de WhatsApp para ofrecerlo.`;
  if (a === "creativos") {
    const st = mkState(S.mk as Record<string, Record<string, unknown>>, p.id);
    const A = angles(mkCtx(p, f.money));
    return `Crea creativos para TikTok y Reels. ${mkPromptCtx(S, f)} Ángulo principal: ${A[st.ang] ?? A[0]}. Dame 10 ganchos de 3 segundos distintos a los obvios, 3 guiones con escenas y tiempos, 3 textos de anuncio y 5 titulares, en español colombiano natural.`;
  }
  if (a === "test") {
    const tf = i.testForm ?? (S.testForm as Record<string, unknown>);
    const opt = (v: unknown) => (v === "" || v == null ? null : n(v));
    const c = E.test(
      {
        ads: n(tf.ads),
        imp: n(tf.imp),
        clics: n(tf.clics),
        ped: n(tf.ped),
        conf: opt(tf.conf),
        ent: opt(tf.ent),
        aov: n(tf.aov),
      },
      p,
    ) as TestResult;
    const v = E.verdict(c, n(tf.meta), S.risk, p);
    return `Analiza este test: "${tf.nombre || "sin nombre"}" en ${tf.canal}, ${tf.dias} días. Ads ${f.money(c.ads)}, pedidos ${c.ped}, entregados ${Math.round(c.ent)}, devueltos ${Math.round(c.dev)}, AOV ${f.money(c.aov)}, recaudo ${f.money(c.ingresos)}, contribución ${f.money(c.contrib)}, utilidad neta ${f.money(c.neta)}, ROAS ${f.x(c.roas)} (equilibrio ${f.x(c.roasEq)}), CPA ${f.money(c.cpa)} (máximo ${f.money(c.cpaMax)}), rentabilidad ${f.pct(c.rent / 100)} vs meta ${tf.meta}%. Veredicto del modelo: ${v.label}.`;
  }
  if (a === "plan") {
    const pf = (i.planForm ?? S.planForm) as Record<string, unknown>;
    const pl = E.plan(pf as Parameters<typeof E.plan>[0], S.risk);
    const u = String(pf.unidad);
    return `Propón cómo desplegar capital. Meta de facturación ${f.money(n(pf.R))} por ${u}, margen bruto ${f.pct(pl.m)}, fijos ${f.money(n(pf.fijos))}, capital ${f.money(n(pf.cap))}, horizonte ${pl.N} ${u}(es), dinero en tránsito ${pf.ret}%, devoluciones ${pf.ree}%. El modelo calculó: ROAS objetivo ${f.x(pl.targetROAS)} (equilibrio ${f.x(pl.be)}), ads a pleno ${f.money(pl.full)}, capital a inyectar ${f.money(pl.tot)}, utilidad neta a pleno ${f.money(pl.fullNet)}, autofinanciamiento desde ${pl.self ? u + " " + pl.self : "—"}. Plan: ${pl.rows.map((r) => `${u} ${r.i}: inyectar ${f.money(r.inject)}, ads ${f.money(r.spend)}, facturación ${f.money(r.rev)}, neta ${f.money(r.net)}`).join("; ")}. Justifica el propósito de cada recomendación.`;
  }
  if (a === "semanal") {
    const ts = S.tests
      .slice(0, 10)
      .map((t) => {
        const c = t.c as unknown as TestResult;
        return `${t.producto} (${new Date(t.ts).toLocaleDateString("es-CO")}): ads ${f.money(c.ads)}, pedidos ${c.ped}, entrega ${f.pct(c.tasaEntrega)}, ROAS ${f.x(c.roas)}, CPA ${f.money(c.cpa)}, neta ${f.money(c.neta)}, veredicto ${t.verdict}`;
      })
      .join("; ");
    const ps = S.products
      .map((x) => {
        const g = E.gate(x, S.risk);
        return `${x.nombre}: utilidad/pedido ${f.money(g.u.utilidadPedido)}, ${g.pass ? "pasa" : "no pasa"}`;
      })
      .join("; ");
    return `Haz la revisión semanal del negocio. Productos: ${ps}. Últimos tests: ${ts || "ninguno"}. Dime qué escalar, qué optimizar, qué matar, qué producto testear después y cuánto capital mover esta semana.`;
  }
  return "";
}

/** Prompt completo, igual que askMentor (L1153) y qaAI (L1037). */
export function mentorPrompt(
  a: MentorAction,
  S: CopilotState,
  i: MentorInput,
  f: Fmt,
): string {
  if (a === "alta") {
    const p = i.draft ?? activeProduct(S);
    return `${MENTOR_BASE}\nCompleta la ficha de un producto para vender por contraentrega en Colombia. Producto: "${p.nombre}". Categoría: ${p.categoria}. Costo proveedor ${f.money(p.costo)}, precio de venta ${f.money(p.precio)}. Descripción del proveedor: ${p.notas || "—"}.\nResponde SOLO JSON válido: {"nombre_corto":"nombre comercial corto","categoria":"una de: ${CATS.join(", ")}","publico":"","beneficio":"","dolor":"","angulos":["","","","",""],"objeciones":["","","","",""],"invima":"No | Sí | No sé","score":{${E.CRIT.map(([k]) => `"${k}":1-5`).join(",")}}}`;
  }
  return `${MENTOR_BASE}\n${mentorCtx(S, f)}\n${actionPrompt(a, S, i, f)}\nResponde SOLO JSON válido con esta forma: ${SHAPE[a]}`;
}

/** Aplica la respuesta de «Mejorar textos con IA» al borrador (qaApplyJSON, L1033). */
export function applyAlta(p: Product, j: MentorResult<"alta">): Product {
  const out = { ...p, score: { ...p.score } } as Product;
  if (j.publico) out.publico = j.publico;
  if (j.beneficio) out.beneficio = j.beneficio;
  if (j.dolor) out.dolor = j.dolor;
  if (Array.isArray(j.angulos) && j.angulos.length)
    out.angulos = j.angulos.join(" · ");
  if (Array.isArray(j.objeciones) && j.objeciones.length)
    out.objeciones = j.objeciones.join("\n");
  if (j.categoria && (CATS as readonly string[]).includes(j.categoria))
    out.categoria = j.categoria;
  if (["No", "Sí", "No sé"].includes(j.invima)) out.invima = j.invima;
  if (j.nombre_corto) out.nombre = String(j.nombre_corto);
  E.CRIT.forEach(([k]) => {
    const v = +((j.score as Record<string, number>)[k] ?? NaN);
    if (v >= 1 && v <= 5)
      (out.score as Record<string, number>)[k] = Math.round(v);
  });
  return out;
}

/** Límite de usos por persona y día. */
export const MENTOR_LIMITE_DIARIO = 25;
