import { formatDate, formatMonth, formatMonthShort, type ISODate } from "@/lib/finance/dates";
import { formatMoney, formatPercent, type Minor } from "@/lib/money/money";

export function formatters(currency: string, locale: string) {
  return {
    money: (m: Minor, cur = currency) => formatMoney(m, cur, locale),
    signed: (m: Minor, cur = currency) => formatMoney(m, cur, locale, { signed: true }),
    compact: (m: Minor, cur = currency) => formatMoney(m, cur, locale, { compact: true }),
    pct: (v: number | null, digits = 1) => formatPercent(v, locale, digits),
    date: (d: ISODate, style: "short" | "medium" | "long" = "medium") => formatDate(d, locale, style),
    month: (d: ISODate, short = false) => formatMonth(d, locale, short),
    /** Etiqueta compacta para ejes: "nov 26". */
    axisMonth: (d: ISODate) => formatMonthShort(d, locale),
    months: (v: number | null) => (v === null ? "—" : `${v.toLocaleString(locale, { maximumFractionDigits: 1 })} meses`),
  };
}
export type Fmt = ReturnType<typeof formatters>;
