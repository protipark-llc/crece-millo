import "./helpers";
import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb, withUser } from "@/lib/db/client";
import { copilotoProducts, copilotoSettings } from "@/lib/db/schema";
import { addTest, createProduct, savePlan, setRouteStep } from "@/server/services/copilot";
import { importState, loadState, putProduct, putTest, removeProduct, resetState, saveSettings } from "@/server/services/copiloto";
import { E } from "@/lib/copiloto/engine";
import { parseBackup, type Product, type Test } from "@/lib/copiloto/state";
import { UserFacingError } from "@/server/services/errors";
import { TODAY, newUser } from "./helpers";

afterAll(async () => {
  await closeDb();
});

const demo = () => parseBackup(JSON.parse(readFileSync("docs/copiloto/motor/estado-demo.json", "utf8")), TODAY);

describe("Co-Piloto: estado por usuario", () => {
  it("una cuenta nueva empieza con los 6 productos del original y la configuración por defecto", async () => {
    const u = await newUser("cop-nuevo");
    const S = await withUser(u.id, (tx) => loadState(tx, u.id, TODAY));
    expect(S.products.map((p) => p.id)).toEqual(["ojos", "cuello", "lampara", "mopa", "difusor", "mascarilla"]);
    expect(S).toMatchObject({ risk: 5, cur: "COP", trm: 3300, active: "ojos", tests: [], plans: [], sims: [] });
    // Segunda carga: lee lo guardado, no vuelve a crear.
    const again = await withUser(u.id, (tx) => loadState(tx, u.id, "2027-01-01"));
    expect(again.products[0]!.fecha).toBe(TODAY);
  });

  it("dos cargas simultáneas en la primera visita no duplican nada", async () => {
    const u = await newUser("cop-carrera");
    const [a, b] = await Promise.all([withUser(u.id, (tx) => loadState(tx, u.id, TODAY)), withUser(u.id, (tx) => loadState(tx, u.id, TODAY))]);
    expect(a.products).toHaveLength(6);
    expect(b.products).toHaveLength(6);
  });

  it("respaldo: importar el estado de demostración y exportarlo da lo mismo", async () => {
    const u = await newUser("cop-respaldo");
    const S = demo();
    await withUser(u.id, (tx) => importState(tx, u.id, S));
    const out = await withUser(u.id, (tx) => loadState(tx, u.id, TODAY));
    expect(out.products).toEqual(S.products);
    expect(out.tests).toEqual([...S.tests].sort((x, y) => y.ts - x.ts));
    expect(out.pc).toEqual(S.pc);
    expect(out.mk).toEqual(S.mk);
    expect({ risk: out.risk, cur: out.cur, trm: out.trm, active: out.active, marca: out.marca, checks: out.checks, testForm: out.testForm, planForm: out.planForm, simForm: out.simForm }).toEqual({
      risk: S.risk,
      cur: S.cur,
      trm: S.trm,
      active: S.active,
      marca: S.marca,
      checks: S.checks,
      testForm: S.testForm,
      planForm: S.planForm,
      simForm: S.simForm,
    });
    // Los números del motor no cambian al pasar por la base.
    const ojos = out.products.find((p) => p.id === "ojos")!;
    expect(E.evaluate(ojos, out.risk)).toEqual(E.evaluate(S.products.find((p) => p.id === "ojos")!, S.risk));
    await withUser(u.id, (tx) => resetState(tx, u.id, TODAY));
    const reset = await withUser(u.id, (tx) => loadState(tx, u.id, TODAY));
    expect(reset.tests).toEqual([]);
    expect(reset.products).toHaveLength(6);
  });

  it("cambios puntuales: producto nuevo al final, tests que sobreviven al borrar, no se borra el último", async () => {
    const u = await newUser("cop-cambios");
    const S = await withUser(u.id, (tx) => loadState(tx, u.id, TODAY));
    const nuevo = { ...S.products[0]!, id: "p1", nombre: "Nuevo producto" } as Product;
    await withUser(u.id, (tx) => putProduct(tx, u.id, nuevo));
    await withUser(u.id, (tx) => putProduct(tx, u.id, { ...nuevo, precio: 99900 }));
    const t: Test = { id: "t1", ts: Date.parse("2026-10-01T12:00:00"), risk: 5, productId: "p1", producto: "Nuevo producto", form: { ads: 1 }, c: { ads: 1 }, verdict: "Faltan datos", meta: 20 };
    await withUser(u.id, (tx) => putTest(tx, u.id, t));
    await withUser(u.id, (tx) => saveSettings(tx, u.id, { active: "p1", risk: 8 }));
    let now = await withUser(u.id, (tx) => loadState(tx, u.id, TODAY));
    expect(now.products.at(-1)).toMatchObject({ id: "p1", precio: 99900 });
    expect(now).toMatchObject({ active: "p1", risk: 8 });
    await withUser(u.id, (tx) => removeProduct(tx, u.id, "p1"));
    now = await withUser(u.id, (tx) => loadState(tx, u.id, TODAY));
    expect(now.products.some((p) => p.id === "p1")).toBe(false);
    expect(now.active).toBe("ojos");
    expect(now.tests[0]).toMatchObject({ id: "t1", producto: "Nuevo producto" });
    for (const p of now.products.slice(1)) await withUser(u.id, (tx) => removeProduct(tx, u.id, p.id));
    await expect(withUser(u.id, (tx) => removeProduct(tx, u.id, "ojos"))).rejects.toBeInstanceOf(UserFacingError);
  });

  it("aislamiento: otra persona no ve el Co-Piloto ajeno (servicio y RLS)", async () => {
    const a = await newUser("cop-a");
    const b = await newUser("cop-b");
    await withUser(a.id, (tx) => importState(tx, a.id, demo()));
    const seenByB = await withUser(b.id, (tx) => tx.select().from(copilotoProducts));
    expect(seenByB).toHaveLength(0);
    const raw = await getDb().execute(sql`select count(*)::int as n from copiloto_products`);
    expect((raw.rows[0] as { n: number }).n).toBe(0);
    const bState = await withUser(b.id, (tx) => loadState(tx, b.id, TODAY));
    expect(bState.tests).toEqual([]);
  });
});

describe("Co-Piloto: migración de los datos del Co-Piloto anterior", () => {
  it("conserva productos, valores, tests (recalculados con el motor), plan y avance de la ruta", async () => {
    const u = await newUser("cop-legado");
    const id = await withUser(u.id, (tx) =>
      createProduct(
        tx,
        u.id,
        {
          name: "Organizador de cables",
          supplier: "Bodega Norte",
          status: "prueba",
          productCost: "45.000",
          shippingCost: "15.000",
          otherCosts: "3.000",
          returnShippingCost: null,
          paymentFeePct: 3,
          platformFeePct: 2,
          returnRatePct: 20,
          expectedCpa: "25.000",
          targetMarginPct: 20,
          salePrice: "139.900",
          notes: "Proveedor confiable",
        },
        "COP",
      ),
    );
    await withUser(u.id, (tx) => addTest(tx, u.id, { productId: id, startedOn: "2026-10-01", days: 4, adSpend: "200.000", orders: 6, channel: "Meta", notes: null }));
    await withUser(u.id, (tx) => savePlan(tx, u.id, { capital: "2.000.000", reservePct: 30, monthlyFixed: "150.000", testBudget: null }, "COP"));
    await withUser(u.id, (tx) => setRouteStep(tx, u.id, "f1-capital", true));
    await withUser(u.id, (tx) => setRouteStep(tx, u.id, "f4-lanzar", true));

    const S = await withUser(u.id, (tx) => loadState(tx, u.id, TODAY));
    expect(S.products).toHaveLength(1);
    const p = S.products[0]!;
    expect(p).toMatchObject({
      nombre: "Organizador de cables",
      etapa: "En test",
      proveedor: "Bodega Norte",
      notas: "Proveedor confiable",
      costo: 45000,
      precio: 139900,
      flete: 15000,
      fleteRet: 15000,
      empaque: 3000,
      com: 5,
      entrega: 80,
      conf: 100,
      meta: 20,
      costoReal: true,
    });
    expect(S.active).toBe(p.id);
    expect(S.pc[p.id]).toMatchObject({ cpa0: 25000, P: 139900 });
    expect(S.tests).toHaveLength(1);
    const t = S.tests[0]!;
    expect(t.form).toMatchObject({ fecha: "2026-10-01", canal: "Meta", dias: 4, ads: 200000, ped: 6 });
    expect(t.c).toEqual(JSON.parse(JSON.stringify(E.test(t.form, p))));
    expect(t.verdict).toBe(E.verdict(E.test(t.form, p), 20, 5, p).label);
    expect(S.planForm).toMatchObject({ cap: 2000000, fijos: 150000 });
    expect(S.simForm).toMatchObject({ cap: 2000000, fijos: 150000 });
    expect(S.checks).toEqual({ f0b: true, f3a: true });
    const [settings] = await withUser(u.id, (tx) => tx.select().from(copilotoSettings));
    expect(settings!.origin).toBe("legacy");
  });
});
