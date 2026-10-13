import { and, asc, desc, eq } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { copilotPlans, copilotProducts, copilotTests, dropshipProgress } from "@/lib/db/schema";
import { MoneyError, parseAmount } from "@/lib/money/money";
import { analyzePrice, checkPrice, judgeTest, planCapital, suggestedTestBudget, type PricingInput } from "@/lib/copilot/engine";
import { ROUTE_STEP_KEYS } from "@/lib/copilot/route";
import { UserFacingError } from "./errors";

export type CopilotProduct = typeof copilotProducts.$inferSelect;
export type CopilotTest = typeof copilotTests.$inferSelect;
export const PRODUCT_STATUSES = ["idea", "prueba", "ganador", "pausado", "descartado"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];
export const STATUS_LABEL: Record<ProductStatus, string> = { idea: "Idea", prueba: "En prueba", ganador: "Ganador", pausado: "Pausado", descartado: "Descartado" };

function money(text: string | null | undefined, currency: string, field: string, opts: { positive?: boolean } = {}) {
  if (!text || !text.trim()) return 0;
  try {
    const v = parseAmount(text, currency);
    if (opts.positive && v <= 0) throw new UserFacingError("El importe debe ser mayor que cero.", field);
    return v;
  } catch (e) {
    if (e instanceof MoneyError) throw new UserFacingError(e.message, field);
    throw e;
  }
}
const bps = (pct: number | null) => (pct === null ? 0 : Math.round(pct * 100));

export interface ProductInputText {
  name: string;
  supplier: string | null;
  status: ProductStatus;
  productCost: string;
  shippingCost: string;
  otherCosts: string | null;
  returnShippingCost: string | null;
  paymentFeePct: number | null;
  platformFeePct: number | null;
  returnRatePct: number | null;
  expectedCpa: string | null;
  targetMarginPct: number | null;
  salePrice: string | null;
  notes: string | null;
}

function productValues(input: ProductInputText, currency: string) {
  const shipping = money(input.shippingCost, currency, "shippingCost");
  return {
    name: input.name,
    supplier: input.supplier,
    status: input.status,
    currency,
    productCost: money(input.productCost, currency, "productCost", { positive: true }),
    shippingCost: shipping,
    otherCosts: money(input.otherCosts, currency, "otherCosts"),
    // Si no se indica el flete de regreso, se asume igual al de ida (supuesto visible en la pantalla).
    returnShippingCost: input.returnShippingCost && input.returnShippingCost.trim() ? money(input.returnShippingCost, currency, "returnShippingCost") : shipping,
    paymentFeeBps: bps(input.paymentFeePct),
    platformFeeBps: bps(input.platformFeePct),
    returnRateBps: bps(input.returnRatePct),
    expectedCpa: money(input.expectedCpa, currency, "expectedCpa"),
    targetMarginBps: input.targetMarginPct === null ? 2000 : bps(input.targetMarginPct),
    salePrice: input.salePrice && input.salePrice.trim() ? money(input.salePrice, currency, "salePrice", { positive: true }) : null,
    notes: input.notes,
  };
}

export async function listProducts(tx: Tx, userId: string) {
  return tx.select().from(copilotProducts).where(eq(copilotProducts.userId, userId)).orderBy(desc(copilotProducts.updatedAt));
}

export async function getProduct(tx: Tx, userId: string, id: string) {
  const [p] = await tx.select().from(copilotProducts).where(and(eq(copilotProducts.id, id), eq(copilotProducts.userId, userId)));
  if (!p) throw new UserFacingError("Producto no encontrado.");
  return p;
}

export async function createProduct(tx: Tx, userId: string, input: ProductInputText, currency: string) {
  const [p] = await tx.insert(copilotProducts).values({ userId, ...productValues(input, currency) }).returning({ id: copilotProducts.id });
  return p!.id;
}

export async function updateProduct(tx: Tx, userId: string, id: string, input: ProductInputText) {
  const p = await getProduct(tx, userId, id);
  await tx.update(copilotProducts).set(productValues(input, p.currency)).where(and(eq(copilotProducts.id, id), eq(copilotProducts.userId, userId)));
}

export async function setProductStatus(tx: Tx, userId: string, id: string, status: ProductStatus) {
  await getProduct(tx, userId, id);
  await tx.update(copilotProducts).set({ status }).where(and(eq(copilotProducts.id, id), eq(copilotProducts.userId, userId)));
}

export async function deleteProduct(tx: Tx, userId: string, id: string) {
  await getProduct(tx, userId, id);
  await tx.delete(copilotProducts).where(and(eq(copilotProducts.id, id), eq(copilotProducts.userId, userId)));
}

export async function listTests(tx: Tx, userId: string, productId?: string) {
  const where = productId ? and(eq(copilotTests.userId, userId), eq(copilotTests.productId, productId)) : eq(copilotTests.userId, userId);
  return tx.select().from(copilotTests).where(where).orderBy(desc(copilotTests.startedOn), desc(copilotTests.createdAt));
}

export async function addTest(
  tx: Tx,
  userId: string,
  input: { productId: string; startedOn: string; days: number; adSpend: string; orders: number; channel: string | null; notes: string | null },
) {
  const p = await getProduct(tx, userId, input.productId);
  const adSpend = money(input.adSpend, p.currency, "adSpend");
  await tx.insert(copilotTests).values({ userId, productId: p.id, startedOn: input.startedOn, days: input.days, adSpend, orders: input.orders, channel: input.channel, notes: input.notes });
  if (p.status === "idea") await setProductStatus(tx, userId, p.id, "prueba");
}

export async function deleteTest(tx: Tx, userId: string, id: string) {
  await tx.delete(copilotTests).where(and(eq(copilotTests.id, id), eq(copilotTests.userId, userId)));
}

/** Entradas del motor a partir de un producto guardado. */
export function pricingInput(p: CopilotProduct): PricingInput {
  return {
    productCost: p.productCost,
    shippingCost: p.shippingCost,
    otherCosts: p.otherCosts,
    returnShippingCost: p.returnShippingCost,
    paymentFeeBps: p.paymentFeeBps,
    platformFeeBps: p.platformFeeBps,
    returnRateBps: p.returnRateBps,
    expectedCpa: p.expectedCpa,
    targetMarginBps: p.targetMarginBps,
  };
}

/** Análisis completo de un producto: precio recomendado, precio en uso, CPA y último veredicto. */
export function productSummary(p: CopilotProduct, tests: CopilotTest[]) {
  const input = pricingInput(p);
  const analysis = analyzePrice(input, p.currency);
  const price = p.salePrice ?? analysis.recommendedPrice;
  const check = price ? checkPrice(input, price) : null;
  const judge = (t: CopilotTest) =>
    judgeTest({ adSpend: t.adSpend, orders: t.orders, days: t.days, breakEvenCpa: check?.contribution ?? 0, targetCpa: check?.targetCpa ?? 0 });
  const productTests = tests.filter((t) => t.productId === p.id).map((t) => ({ test: t, result: judge(t) }));
  return { product: p, analysis, price, usingRecommended: p.salePrice === null, check, tests: productTests, latest: productTests[0] ?? null };
}

export async function getPlan(tx: Tx, userId: string) {
  const [p] = await tx.select().from(copilotPlans).where(eq(copilotPlans.userId, userId));
  return p ?? null;
}

export async function savePlan(tx: Tx, userId: string, input: { capital: string; reservePct: number | null; monthlyFixed: string | null; testBudget: string | null }, currency: string) {
  const values = {
    currency,
    capital: money(input.capital, currency, "capital"),
    reserveBps: input.reservePct === null ? 3000 : bps(input.reservePct),
    monthlyFixed: money(input.monthlyFixed, currency, "monthlyFixed"),
    testBudget: input.testBudget && input.testBudget.trim() ? money(input.testBudget, currency, "testBudget", { positive: true }) : null,
  };
  await tx.insert(copilotPlans).values({ userId, ...values }).onConflictDoUpdate({ target: copilotPlans.userId, set: values });
}

/** Plan de capital: si no hay presupuesto de prueba propio, se sugiere 3 × el CPA de equilibrio del producto en prueba. */
export function capitalSummary(plan: Awaited<ReturnType<typeof getPlan>>, referenceBreakEvenCpa: number | null) {
  if (!plan) return null;
  const suggested = referenceBreakEvenCpa && referenceBreakEvenCpa > 0 ? suggestedTestBudget(referenceBreakEvenCpa) : null;
  const testBudget = plan.testBudget ?? suggested ?? 0;
  return { plan, testBudget, suggested, usingSuggested: plan.testBudget === null, result: planCapital({ capital: plan.capital, reserveBps: plan.reserveBps, monthlyFixed: plan.monthlyFixed, testBudget }) };
}

export async function routeProgress(tx: Tx, userId: string) {
  const rows = await tx.select().from(dropshipProgress).where(eq(dropshipProgress.userId, userId)).orderBy(asc(dropshipProgress.doneAt));
  return new Set(rows.map((r) => r.stepKey));
}

export async function setRouteStep(tx: Tx, userId: string, stepKey: string, done: boolean) {
  if (!ROUTE_STEP_KEYS.includes(stepKey)) throw new UserFacingError("Paso desconocido.");
  if (done) await tx.insert(dropshipProgress).values({ userId, stepKey }).onConflictDoNothing();
  else await tx.delete(dropshipProgress).where(and(eq(dropshipProgress.userId, userId), eq(dropshipProgress.stepKey, stepKey)));
}
