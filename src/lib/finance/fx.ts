/**
 * Conversión de moneda. Solo se convierte cuando existe una tasa con fecha de
 * referencia identificable; si no, la función devuelve null y el llamador debe
 * excluir el importe de los totales consolidados y advertirlo.
 */
import { roundMinor, type Minor } from "@/lib/money/money";
import { currencyInfo } from "@/lib/money/currency";
import type { ISODate } from "./dates";
import type { ExchangeRate } from "./types";

export function findRate(rates: ExchangeRate[], from: string, to: string, onDate: ISODate): number | null {
  if (from === to) return 1;
  let best: ExchangeRate | null = null;
  let inverse = false;
  for (const r of rates) {
    if (r.asOf > onDate) continue;
    if (r.from === from && r.to === to && (!best || r.asOf > best.asOf)) {
      best = r;
      inverse = false;
    } else if (r.from === to && r.to === from && (!best || r.asOf > best.asOf)) {
      best = r;
      inverse = true;
    }
  }
  if (!best || best.rate <= 0) return null;
  return inverse ? 1 / best.rate : best.rate;
}

export function convert(
  amount: Minor,
  from: string,
  to: string,
  rates: ExchangeRate[],
  onDate: ISODate,
): Minor | null {
  if (from === to) return amount;
  const rate = findRate(rates, from, to, onDate);
  if (rate === null) return null;
  const expDiff = currencyInfo(to).exponent - currencyInfo(from).exponent;
  return roundMinor(amount * rate * 10 ** expDiff);
}
