/**
 * Aritmética monetaria.
 *
 * Política (ver docs/FORMULAS.md):
 * - Un importe es un entero de unidades menores (`Minor`). Nunca se guarda ni se
 *   suma un importe como número decimal de punto flotante.
 * - Las operaciones enteras (suma, resta) se validan contra
 *   Number.MAX_SAFE_INTEGER (≈ 9 × 10^15 centavos, de sobra para finanzas personales).
 * - Multiplicaciones por razones (porcentajes, prorrateos) se hacen con BigInt y
 *   redondeo "half-up" simétrico (0,5 se aleja de cero).
 * - Los cálculos con tasas de interés usan potencias reales; el resultado se
 *   redondea a la unidad menor en cada periodo con `roundMinor`.
 */
import { currencyInfo } from "./currency";

export type Minor = number;

export class MoneyError extends Error {}

export function assertMinor(value: number, label = "importe"): Minor {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`El ${label} no es un entero seguro de unidades menores: ${value}`);
  }
  return value;
}

export function add(...values: Minor[]): Minor {
  let total = 0;
  for (const v of values) total = assertMinor(total + assertMinor(v));
  return total;
}

export function sub(a: Minor, b: Minor): Minor {
  return assertMinor(assertMinor(a) - assertMinor(b));
}

export function sum(values: Iterable<Minor>): Minor {
  let total = 0;
  for (const v of values) total = assertMinor(total + assertMinor(v));
  return total;
}

/** Redondea un valor real a unidad menor, alejando 0,5 de cero. */
export function roundMinor(value: number): Minor {
  if (!Number.isFinite(value)) throw new MoneyError(`Valor no finito: ${value}`);
  // Se corrige el error binario típico (p. ej. 2.4999999999 → 2.5) antes de redondear.
  const corrected = Number(Math.abs(value).toPrecision(15));
  return assertMinor(Math.sign(value) * Math.round(corrected) || 0);
}

/** amount × numerator / denominator con redondeo half-up exacto (BigInt). */
export function mulRatio(amount: Minor, numerator: number, denominator: number): Minor {
  assertMinor(amount);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    throw new MoneyError("La razón debe expresarse con enteros y denominador distinto de cero");
  }
  const sign = Math.sign(amount) * Math.sign(numerator) * Math.sign(denominator);
  const n = BigInt(Math.abs(amount)) * BigInt(Math.abs(numerator));
  const d = BigInt(Math.abs(denominator));
  const q = n / d;
  const r = n % d;
  const rounded = r * 2n >= d ? q + 1n : q;
  const result = Number(rounded) * (sign < 0 ? -1 : 1);
  return assertMinor(result || 0);
}

/** Aplica un porcentaje con precisión de centésimas de punto (bps). 10 → +10 %. */
export function applyPercentChange(amount: Minor, percent: number): Minor {
  const bps = Math.round(percent * 100);
  return mulRatio(amount, 10000 + bps, 10000);
}

/** Porcentaje de un importe: percentOf(1000, 10) → 100. */
export function percentOf(amount: Minor, percent: number): Minor {
  const bps = Math.round(percent * 100);
  return mulRatio(amount, bps, 10000);
}

/** Divide un importe en partes enteras (la diferencia de redondeo va a las primeras). */
export function allocateEvenly(amount: Minor, parts: number): Minor[] {
  if (!Number.isInteger(parts) || parts <= 0) throw new MoneyError("Partes inválidas");
  const base = Math.trunc(amount / parts);
  let remainder = amount - base * parts;
  const step = Math.sign(remainder);
  return Array.from({ length: parts }, () => {
    if (remainder !== 0) {
      remainder -= step;
      return base + step;
    }
    return base;
  });
}

/** Razón a/b como número real, o null si b = 0 (nunca divide por cero). */
export function ratio(a: Minor, b: Minor): number | null {
  if (b === 0) return null;
  return a / b;
}

export function toMajor(minor: Minor, currency: string): number {
  return minor / 10 ** currencyInfo(currency).exponent;
}

export function fromMajor(major: number, currency: string): Minor {
  return roundMinor(major * 10 ** currencyInfo(currency).exponent);
}

/**
 * Convierte texto escrito por una persona a unidades menores.
 *
 * Reglas (pensadas para es-CO pero tolerantes):
 * - Se ignoran espacios, el símbolo $ y el código de moneda.
 * - Si hay coma, la coma es decimal y los puntos son separadores de miles: "1.200.000,50".
 * - Sin coma: varios puntos → miles ("1.200.000"); un punto seguido de exactamente
 *   3 dígitos → miles ("1.200"); en otro caso el punto es decimal ("1200.5").
 * - No se aceptan negativos (el signo lo determina el tipo de movimiento).
 * - No se aceptan más decimales que el exponente de la moneda.
 */
export function parseAmount(input: string, currency: string): Minor {
  const { exponent } = currencyInfo(currency);
  let s = input.trim().replace(/\s|\$/g, "").replace(new RegExp(currency, "i"), "");
  if (s === "") throw new MoneyError("Ingresa un importe");
  if (s.startsWith("-") || s.startsWith("\u2212")) throw new MoneyError("El importe no puede ser negativo");
  if (!/^[0-9.,]+$/.test(s)) throw new MoneyError("El importe solo puede contener números, puntos y comas");
  let intPart: string;
  let fracPart = "";
  if (s.includes(",")) {
    const pieces = s.split(",");
    if (pieces.length > 2) throw new MoneyError("Formato de importe inválido");
    intPart = pieces[0]!.replace(/\./g, "");
    fracPart = pieces[1]!;
  } else {
    const dots = (s.match(/\./g) ?? []).length;
    if (dots === 0) intPart = s;
    else if (dots > 1) {
      if (!/^\d{1,3}(\.\d{3})+$/.test(s)) throw new MoneyError("Formato de importe inválido");
      intPart = s.replace(/\./g, "");
    } else {
      const [a, b] = s.split(".") as [string, string];
      if (b.length === 3 && a.length > 0) intPart = a + b;
      else {
        intPart = a;
        fracPart = b;
      }
    }
  }
  if (intPart === "") intPart = "0";
  if (!/^\d+$/.test(intPart) || !/^\d*$/.test(fracPart)) throw new MoneyError("Formato de importe inválido");
  if (fracPart.length > exponent) {
    throw new MoneyError(exponent === 0 ? "Esta moneda no admite decimales" : `Máximo ${exponent} decimales`);
  }
  s = intPart + fracPart.padEnd(exponent, "0");
  const value = Number(s);
  if (!Number.isSafeInteger(value)) throw new MoneyError("El importe es demasiado grande");
  return value;
}

/** Representación editable (sin separadores de miles) para precargar formularios. */
export function toInputString(minor: Minor, currency: string): string {
  const { exponent } = currencyInfo(currency);
  const negative = minor < 0;
  const abs = Math.abs(minor).toString().padStart(exponent + 1, "0");
  const int = exponent ? abs.slice(0, -exponent) : abs;
  const frac = exponent ? abs.slice(-exponent).replace(/0+$/, "") : "";
  return (negative ? "-" : "") + int + (frac ? "," + frac : "");
}

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(
  minor: Minor,
  currency: string,
  locale = "es-CO",
  opts: { compact?: boolean; signed?: boolean } = {},
): string {
  const info = currencyInfo(currency);
  const key = `${locale}|${currency}|${opts.compact ? 1 : 0}|${opts.signed ? 1 : 0}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: opts.compact ? 0 : info.displayDecimals,
      maximumFractionDigits: opts.compact ? 1 : info.displayDecimals,
      notation: opts.compact ? "compact" : "standard",
      signDisplay: opts.signed ? "exceptZero" : "auto",
    });
    formatterCache.set(key, fmt);
  }
  // Signo menos tipográfico (−, U+2212): la guía de contenido lo pide en lugar del guion.
  return fmt.format(toMajor(minor, currency)).replace(/^-/, "\u2212");
}

/** Porcentaje en estilo es-CO de la guía: «26,67 %» (espacio duro antes del signo, menos real). */
export function formatPercent(value: number | null, locale = "es-CO", digits = 1): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const n = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: digits }).format(value * 100);
  return `${n.replace(/^-/, "\u2212")}\u00a0%`;
}
