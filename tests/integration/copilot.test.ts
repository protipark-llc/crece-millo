import "./helpers";
import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb, withUser } from "@/lib/db/client";
import { copilotProducts } from "@/lib/db/schema";
import { addTest, capitalSummary, createProduct, getPlan, getProduct, listProducts, listTests, productSummary, routeProgress, savePlan, setRouteStep } from "@/server/services/copilot";
import { getSettings, setView } from "@/server/services/settings";
import { enabledSections } from "@/lib/sections";
import { UserFacingError } from "@/server/services/errors";
import { newUser } from "./helpers";

afterAll(async () => {
  await closeDb();
});

const product = {
  name: "Organizador de cables",
  supplier: null,
  status: "idea" as const,
  productCost: "45.000",
  shippingCost: "15.000",
  otherCosts: "3.000",
  returnShippingCost: null,
  paymentFeePct: 3,
  platformFeePct: 2,
  returnRatePct: 20,
  expectedCpa: "25.000",
  targetMarginPct: 20,
  salePrice: null,
  notes: null,
};

describe("Co-Piloto: productos, tests, plan y ruta", () => {
  it("guarda el producto, calcula el precio y el veredicto, y pasa a «En prueba» con el primer test", async () => {
    const u = await newUser("copiloto");
    const id = await withUser(u.id, (tx) => createProduct(tx, u.id, product, "COP"));
    await withUser(u.id, (tx) => addTest(tx, u.id, { productId: id, startedOn: "2026-10-08", days: 4, adSpend: "200.000", orders: 4, channel: "Meta", notes: null }));
    const { p, tests } = await withUser(u.id, async (tx) => ({ p: await getProduct(tx, u.id, id), tests: await listTests(tx, u.id, id) }));
    expect(p.status).toBe("prueba");
    expect(p.returnShippingCost).toBe(p.shippingCost); // vacío = mismo flete de ida
    const s = productSummary(p, tests);
    expect(s.price).toBe(12_790_000); // $ 127.900
    expect(s.check!.contribution).toBe(5_100_500); // CPA máximo $ 51.005
    expect(s.latest!.result.cpa).toBe(5_000_000); // $ 50.000 por venta
    expect(s.latest!.result.verdict).toBe("optimizar"); // ganas, pero menos que tu margen objetivo
  });

  it("plan de capital: reserva y pruebas posibles con el presupuesto sugerido", async () => {
    const u = await newUser("capital");
    await withUser(u.id, (tx) => savePlan(tx, u.id, { capital: "2.000.000", reservePct: 30, monthlyFixed: "150.000", testBudget: null }, "COP"));
    const plan = await withUser(u.id, (tx) => getPlan(tx, u.id));
    const c = capitalSummary(plan, 5_000_000)!; // CPA de equilibrio $ 50.000 → prueba sugerida $ 150.000
    expect(c.testBudget).toBe(15_000_000);
    expect(c.result.productsTestable).toBe(8);
  });

  it("ruta: marcar y desmarcar pasos; rechaza claves desconocidas", async () => {
    const u = await newUser("ruta");
    await withUser(u.id, (tx) => setRouteStep(tx, u.id, "f1-capital", true));
    await withUser(u.id, (tx) => setRouteStep(tx, u.id, "f1-capital", true)); // idempotente
    expect([...(await withUser(u.id, (tx) => routeProgress(tx, u.id)))]).toEqual(["f1-capital"]);
    await withUser(u.id, (tx) => setRouteStep(tx, u.id, "f1-capital", false));
    expect((await withUser(u.id, (tx) => routeProgress(tx, u.id))).size).toBe(0);
    await expect(withUser(u.id, (tx) => setRouteStep(tx, u.id, "inventado", true))).rejects.toBeInstanceOf(UserFacingError);
  });

  it("aislamiento: otra persona no ve ni puede leer el producto (servicio y RLS)", async () => {
    const a = await newUser("dueno");
    const b = await newUser("intruso");
    const id = await withUser(a.id, (tx) => createProduct(tx, a.id, product, "COP"));
    expect(await withUser(b.id, (tx) => listProducts(tx, b.id))).toHaveLength(0);
    await expect(withUser(b.id, (tx) => getProduct(tx, b.id, id))).rejects.toBeInstanceOf(UserFacingError);
    // Aun consultando sin filtro por usuario, RLS no devuelve filas ajenas.
    const rows = await withUser(b.id, (tx) => tx.select().from(copilotProducts));
    expect(rows).toHaveLength(0);
    // Y sin app.user_id no se ve nada.
    const raw = await getDb().execute(sql`select count(*)::int as n from copilot_products`);
    expect((raw.rows[0] as { n: number }).n).toBe(0);
  });
});

describe("vista de la cuenta", () => {
  it("por defecto Pro; Esencial y Personalizada cambian las secciones visibles", async () => {
    const u = await newUser("vista");
    expect(enabledSections(await withUser(u.id, (tx) => getSettings(tx, u.id)))).toContain("presupuesto");
    await withUser(u.id, (tx) => setView(tx, u.id, "esencial", null));
    const e = enabledSections(await withUser(u.id, (tx) => getSettings(tx, u.id)));
    expect(e).toContain("flujo");
    expect(e).not.toContain("presupuesto");
    await withUser(u.id, (tx) => setView(tx, u.id, "personalizada", ["copiloto", "nada"]));
    const s = await withUser(u.id, (tx) => getSettings(tx, u.id));
    expect(s.sections).toEqual(["copiloto", "configuracion"]);
    expect(enabledSections(s)).toEqual(["copiloto", "configuracion"]);
  });
});
