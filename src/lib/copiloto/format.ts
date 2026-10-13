/**
 * Formato es-CO del Co-Piloto (especificación §3). Solo cambia cómo se ve un número, nunca
 * el cálculo: equivalen a money(), pct(), xx() y mesTxt() del original (L620–627) con la
 * tipografía de Crece Millo: espacio duro, coma decimal y signo menos real (−).
 *
 *   formatMoney(129900)            → "$ 129.900"
 *   formatMoney(-12000)            → "−$ 12.000"
 *   formatMoney(129900, usd(3300)) → "US$ 39"
 *   formatPct(0.264)               → "26,4 %"
 *   formatX(3.3)                   → "3,30×"
 *   formatMeses(0.5)               → "15 días"
 *   formatFecha("2026-10-08")      → "8 oct 2026"
 *
 * Importes en pesos (unidad del motor), no en centavos.
 */
import { formatDate, type ISODate } from "@/lib/finance/dates";
import { E, setFormatters, type Aggregate, type CopProduct } from "./engine";

const NBSP = " ";
const MINUS = "−";

export interface MoneyCtx {
  /** Moneda de visualización: COP (por defecto) o USD convertido con la TRM. */
  cur?: "COP" | "USD";
  /** Pesos por dólar (TRM); el original usa 3300 por defecto. */
  trm?: number;
}

const int = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });

/** Dinero: «$ 129.900», «−$ 12.000», «US$ 39» (n ÷ TRM). «—» si no es finito. */
export function formatMoney(n: number, ctx: MoneyCtx = {}): string {
  if (!isFinite(n)) return "—";
  const usd = ctx.cur === "USD";
  const v = usd ? n / (ctx.trm || 3300) : n;
  const body = int.format(Math.round(Math.abs(v)));
  return `${v < 0 ? MINUS : ""}${usd ? "US$" : "$"}${NBSP}${body}`;
}

/** Porcentaje de una fracción: 0.264 → «26,4 %». Hasta 1 decimal, como el original. */
export function formatPct(n: number): string {
  if (!isFinite(n)) return "—";
  return `${oneDecimal.format(n * 100).replace(/^-/, MINUS)}${NBSP}%`;
}

/** Multiplicador: 3.3 → «3,30×». «—» si no es finito o no es positivo (como xx() del original). */
export function formatX(n: number): string {
  return isFinite(n) && n > 0 ? `${n.toFixed(2).replace(".", ",")}×` : "—";
}

/** Meses del simulador (mesTxt del original): «15 días», «1 mes», «2,5 meses». */
export function formatMeses(m: number | null | undefined): string {
  if (m === null || m === undefined) return "—";
  if (m < 1) return `${Math.round(m * 30)} días`;
  if (Math.abs(m - 1) < 0.05) return "1 mes";
  return `${oneDecimal.format(m)} meses`;
}

/** Fecha corta de la guía: «8 oct 2026». */
export function formatFecha(iso: ISODate): string {
  return formatDate(iso, "es-CO", "medium");
}

/**
 * E.diagnose arma textos con los formateadores globales del motor. En el servidor varias
 * personas comparten el módulo, así que se fijan y se restauran en la misma llamada (es
 * síncrona: nadie más corre en medio).
 */
export function diagnoseEsCO(a: Aggregate | null, p: CopProduct, r: number, ctx: MoneyCtx = {}) {
  setFormatters({ money: (n) => formatMoney(n, ctx), pct: formatPct });
  try {
    return E.diagnose(a, p, r);
  } finally {
    setFormatters({ money: (n) => String(n), pct: (n) => String(n) });
  }
}
