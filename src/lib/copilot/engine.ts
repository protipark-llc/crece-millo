/**
 * Motor del Co-Piloto de Negocio (dropshipping con pago contraentrega).
 *
 * Funciones puras, sin base de datos ni interfaz: precio recomendado, CPA máximo, veredicto de
 * un test de anuncios y plan de capital. Importes en unidades menores (enteros) y porcentajes en
 * puntos básicos (1 % = 100 pb), igual que el motor financiero. Cada resultado trae sus supuestos
 * para poder mostrarlos: es una herramienta educativa, no una promesa de ganancia.
 */
import { CURRENCIES } from "@/lib/money/currency";
import { roundMinor, type Minor } from "@/lib/money/money";

const BPS = 10_000;

export interface PricingInput {
  /** Costo del producto al proveedor, por unidad. */
  productCost: Minor;
  /** Envío de ida por pedido. */
  shippingCost: Minor;
  /** Otros costos por pedido: empaque, insumos, llamada de confirmación… */
  otherCosts: Minor;
  /** Envío de regreso de un pedido rechazado o devuelto. */
  returnShippingCost: Minor;
  /** Comisión de recaudo o pasarela sobre el precio (pb). */
  paymentFeeBps: number;
  /** Comisión de plataforma o tienda sobre el precio (pb). */
  platformFeeBps: number;
  /** Pedidos que no se entregan o se devuelven (pb sobre los enviados). */
  returnRateBps: number;
  /** Costo por compra que esperas pagar en anuncios. */
  expectedCpa: Minor;
  /** Margen neto que quieres sobre el precio, después de anuncios (pb). */
  targetMarginBps: number;
}

export interface PriceAnalysis {
  /** Costos por pedido entregado sin anuncios ni comisiones. */
  unitCost: Minor;
  /** Pérdida esperada por devoluciones, repartida en cada pedido entregado. */
  returnLoss: Minor;
  /** Comisiones totales sobre el precio (pb). */
  feeBps: number;
  /** Precio en el que no ganas ni pierdes, con el CPA esperado. */
  breakEvenPrice: Minor | null;
  /** Precio que cumple el margen objetivo, redondeado a un precio de vitrina. */
  recommendedPrice: Minor | null;
  /** Rango saludable: margen entre (objetivo − 10 pp) y (objetivo + 5 pp). */
  range: { low: Minor; high: Minor; lowMarginBps: number; highMarginBps: number } | null;
  warnings: string[];
}

export interface PriceCheck {
  price: Minor;
  /** Lo que queda por pedido antes de anuncios. Es también el CPA máximo de equilibrio. */
  contribution: Minor;
  /** CPA máximo para cumplir el margen objetivo (puede ser negativo: el precio no alcanza). */
  targetCpa: Minor;
  /** Margen neto con el CPA esperado (pb, puede ser negativo). */
  marginBps: number;
  /** Ganancia por pedido con el CPA esperado. */
  profitPerOrder: Minor;
}

/** Pérdida por devoluciones repartida en cada pedido entregado: r / (1 − r) × (ida + regreso). */
export function returnLossPerOrder(i: Pick<PricingInput, "returnRateBps" | "shippingCost" | "returnShippingCost">): Minor {
  const r = Math.max(0, Math.min(9_000, i.returnRateBps));
  if (r === 0) return 0;
  return roundMinor(((i.shippingCost + i.returnShippingCost) * r) / (BPS - r));
}

/** Precio que deja `marginBps` de margen neto con el CPA esperado; null si no existe. */
export function priceForMargin(i: PricingInput, marginBps: number): Minor | null {
  const feeBps = i.paymentFeeBps + i.platformFeeBps;
  const denom = BPS - feeBps - marginBps;
  if (denom <= 0) return null;
  const costs = i.productCost + i.shippingCost + i.otherCosts + returnLossPerOrder(i) + i.expectedCpa;
  if (costs <= 0) return null;
  return roundMinor((costs * BPS) / denom);
}

/**
 * Precio de vitrina: sube al siguiente múltiplo de 1.000 (en unidades mayores) y resta 100
 * (243.120 → 243.900). En monedas con centavos visibles termina en ,99. Nunca baja el precio.
 */
export function shelfPrice(minor: Minor, currency: string): Minor {
  const info = CURRENCIES[currency as keyof typeof CURRENCIES] ?? { exponent: 2, displayDecimals: 2 };
  const unit = 10 ** info.exponent;
  const major = minor / unit;
  if (info.displayDecimals === 0) {
    if (major < 2_000) return Math.ceil(major / 100) * 100 * unit;
    let p = Math.ceil(major / 1_000) * 1_000 - 100;
    if (p < major) p += 1_000;
    return p * unit;
  }
  let p = Math.ceil(major) - 0.01;
  if (p < major) p += 1;
  return Math.round(p * unit);
}

export function analyzePrice(i: PricingInput, currency: string): PriceAnalysis {
  const warnings: string[] = [];
  const feeBps = i.paymentFeeBps + i.platformFeeBps;
  const unitCost = i.productCost + i.shippingCost + i.otherCosts;
  const returnLoss = returnLossPerOrder(i);
  if (i.returnRateBps >= 3_000) warnings.push("Una tasa de devoluciones de 30 % o más se come casi cualquier margen: revisa la confirmación de pedidos antes de escalar.");
  if (i.expectedCpa === 0) warnings.push("Sin un CPA esperado el precio no incluye anuncios: es un piso, no un precio de venta.");
  const breakEven = priceForMargin(i, 0);
  const target = priceForMargin(i, i.targetMarginBps);
  if (target === null) warnings.push("Con estas comisiones y este margen objetivo no existe un precio posible. Baja el margen o las comisiones.");
  const lowMargin = Math.max(0, i.targetMarginBps - 1_000);
  const highMargin = i.targetMarginBps + 500;
  const low = priceForMargin(i, lowMargin);
  const high = priceForMargin(i, highMargin);
  return {
    unitCost,
    returnLoss,
    feeBps,
    breakEvenPrice: breakEven,
    recommendedPrice: target === null ? null : shelfPrice(target, currency),
    range: low !== null && high !== null ? { low: shelfPrice(low, currency), high: shelfPrice(high, currency), lowMarginBps: lowMargin, highMarginBps: highMargin } : null,
    warnings,
  };
}

/** Qué pasa con un precio concreto: contribución, CPA máximos y margen con el CPA esperado. */
export function checkPrice(i: PricingInput, price: Minor): PriceCheck {
  const fees = roundMinor((price * (i.paymentFeeBps + i.platformFeeBps)) / BPS);
  const contribution = price - fees - i.productCost - i.shippingCost - i.otherCosts - returnLossPerOrder(i);
  const targetCpa = contribution - roundMinor((price * i.targetMarginBps) / BPS);
  const profitPerOrder = contribution - i.expectedCpa;
  return { price, contribution, targetCpa, profitPerOrder, marginBps: price > 0 ? Math.round((profitPerOrder * BPS) / price) : 0 };
}

/* ───────────── Test de anuncios ───────────── */

export type Verdict = "seguir" | "optimizar" | "parar" | "falta_info";

export interface TestInput {
  adSpend: Minor;
  orders: number;
  days: number;
  /** CPA de equilibrio del producto (contribución por pedido). */
  breakEvenCpa: Minor;
  /** CPA máximo para cumplir el margen objetivo. */
  targetCpa: Minor;
}

export interface TestResult {
  verdict: Verdict;
  cpa: Minor | null;
  reason: string;
}

export const VERDICT_LABEL: Record<Verdict, string> = { seguir: "Seguir", optimizar: "Optimizar", parar: "Parar", falta_info: "Falta información" };

/**
 * Veredicto con reglas explícitas:
 * 1. Si el producto no deja margen ni sin anuncios → parar.
 * 2. Sin ventas: con gasto ≥ 2 × CPA de equilibrio → parar; si no, falta información.
 * 3. Con menos de 3 días y menos de 3 ventas → falta información.
 * 4. CPA ≤ CPA objetivo → seguir; CPA ≤ 1,25 × CPA de equilibrio → optimizar; si no → parar.
 */
export function judgeTest(t: TestInput): TestResult {
  if (t.breakEvenCpa <= 0) return { verdict: "parar", cpa: null, reason: "Con este precio el producto pierde dinero incluso sin anuncios. Revisa el precio o los costos." };
  const cpa = t.orders > 0 ? roundMinor(t.adSpend / t.orders) : null;
  if (cpa === null) {
    return t.adSpend >= 2 * t.breakEvenCpa
      ? { verdict: "parar", cpa, reason: "Gastaste el doble de tu CPA de equilibrio sin una sola venta." }
      : { verdict: "falta_info", cpa, reason: "Aún no hay ventas. Sigue hasta gastar 2 veces tu CPA de equilibrio o completar 3 días." };
  }
  if (t.days < 3 && t.orders < 3) return { verdict: "falta_info", cpa, reason: "Muy pocos datos: espera al menos 3 días o 3 ventas antes de decidir." };
  if (t.targetCpa > 0 && cpa <= t.targetCpa) return { verdict: "seguir", cpa, reason: "Tu CPA está dentro del objetivo: cumples el margen que te propusiste. Escala de a poco." };
  if (cpa <= Math.round(t.breakEvenCpa * 1.25))
    return {
      verdict: "optimizar",
      cpa,
      reason: cpa <= t.breakEvenCpa ? "Ganas dinero, pero menos que tu margen objetivo. Prueba otro creativo u oferta antes de escalar." : "Estás cerca del equilibrio, ligeramente por encima. Optimiza creativo, público u oferta antes de seguir gastando.",
    };
  return { verdict: "parar", cpa, reason: "Cada venta te cuesta más de lo que deja el producto. Detén el anuncio y prueba otro producto u oferta." };
}

/* ───────────── Plan de capital ───────────── */

export interface CapitalInput {
  capital: Minor;
  /** Parte del capital que no se toca (pb). */
  reserveBps: number;
  /** Costos fijos del mes: tienda, dominio, aplicaciones. */
  monthlyFixed: Minor;
  /** Presupuesto de prueba por producto. */
  testBudget: Minor;
}

export interface CapitalPlan {
  reserve: Minor;
  available: Minor;
  productsTestable: number;
  /** Lo máximo que perderías si todas las pruebas fallan, sin tocar la reserva. */
  maxLoss: Minor;
  warnings: string[];
}

export function planCapital(c: CapitalInput): CapitalPlan {
  const warnings: string[] = [];
  const reserve = roundMinor((c.capital * Math.max(0, Math.min(BPS, c.reserveBps))) / BPS);
  const available = Math.max(0, c.capital - reserve - c.monthlyFixed);
  const productsTestable = c.testBudget > 0 ? Math.floor(available / c.testBudget) : 0;
  if (c.reserveBps < 2_000) warnings.push("Una reserva menor al 20 % te deja sin colchón si una prueba sale mal.");
  if (c.testBudget > 0 && productsTestable < 3) warnings.push("Con este capital alcanzas para menos de 3 pruebas. Lo normal es que varios productos fallen antes de encontrar uno.");
  return { reserve, available, productsTestable, maxLoss: productsTestable * c.testBudget, warnings };
}

/** Presupuesto de prueba sugerido: 3 veces el CPA de equilibrio (mínimo para leer un resultado). */
export function suggestedTestBudget(breakEvenCpa: Minor): Minor {
  return Math.max(0, breakEvenCpa * 3);
}
