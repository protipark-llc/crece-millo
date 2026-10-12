/**
 * Reglas de recurrencia.
 *
 * Reglas de generación (documentadas en docs/FORMULAS.md):
 * - daily/weekly/biweekly: start + n·(1|7|14) días.
 * - monthly/quarterly/yearly: start + n·(1|3|12) meses, anclado al día de inicio
 *   y ajustado al último día del mes cuando no existe (31 → 30/28/29).
 * - semimonthly ("quincenal" colombiano): días 15 y último día de cada mes,
 *   a partir de la fecha de inicio.
 * - once: solo la fecha de inicio.
 * Cada ocurrencia tiene una fecha única por regla; la base de datos impone
 * UNIQUE(recurrence_rule_id, occurrence_date) para que materializarla dos veces
 * (recarga, tarea programada, doble clic) nunca duplique un movimiento.
 */
import { addDays, addMonthsClamped, daysInMonth, diffDays, fromParts, parts, type ISODate } from "./dates";
import type { EngineRule, EngineTx, Frequency } from "./types";

const MAX_OCCURRENCES = 5000;

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: "Única vez",
  daily: "Diaria",
  weekly: "Semanal",
  biweekly: "Cada dos semanas",
  semimonthly: "Quincenal (15 y fin de mes)",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

/** Veces por año, para convertir a equivalente mensual. */
export const OCCURRENCES_PER_YEAR: Record<Exclude<Frequency, "once">, number> = {
  daily: 365,
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
  quarterly: 4,
  yearly: 1,
};

export function occurrences(
  rule: Pick<EngineRule, "frequency" | "startDate" | "endDate">,
  from: ISODate,
  to: ISODate,
): ISODate[] {
  const out: ISODate[] = [];
  const end = rule.endDate && rule.endDate < to ? rule.endDate : to;
  if (end < from || end < rule.startDate) return out;
  const push = (d: ISODate) => {
    if (d >= from && d <= end && d >= rule.startDate) out.push(d);
  };
  const start = rule.startDate;
  switch (rule.frequency) {
    case "once":
      push(start);
      break;
    case "daily":
    case "weekly":
    case "biweekly": {
      const step = rule.frequency === "daily" ? 1 : rule.frequency === "weekly" ? 7 : 14;
      // Saltar directamente cerca de `from` para no iterar años de historia.
      const gap = Math.max(0, Math.floor(diffDays(from, start) / step) - 1);
      for (let n = gap, i = 0; i < MAX_OCCURRENCES; n++, i++) {
        const d = addDays(start, n * step);
        if (d > end) break;
        push(d);
      }
      break;
    }
    case "monthly":
    case "quarterly":
    case "yearly": {
      const step = rule.frequency === "monthly" ? 1 : rule.frequency === "quarterly" ? 3 : 12;
      const anchor = parts(start).d;
      const s = parts(start);
      const f = parts(from);
      const monthsGap = (f.y - s.y) * 12 + (f.m - s.m);
      const firstN = Math.max(0, Math.floor(monthsGap / step) - 1);
      for (let n = firstN, i = 0; i < MAX_OCCURRENCES; n++, i++) {
        const d = addMonthsClamped(start, n * step, anchor);
        if (d > end) break;
        push(d);
      }
      break;
    }
    case "semimonthly": {
      const s = parts(from > start ? from : start);
      let y = s.y;
      let m = s.m;
      for (let i = 0; i < MAX_OCCURRENCES; i++) {
        const mid = fromParts(y, m, 15);
        const last = fromParts(y, m, daysInMonth(y, m));
        if (mid > end) break;
        push(mid);
        if (last > end) break;
        push(last);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
      break;
    }
  }
  return out;
}

/**
 * Ocurrencias virtuales (no guardadas) de las reglas activas dentro del rango,
 * excluyendo las fechas que ya existen como movimiento en cualquier estado
 * (incluido anulado: anular una ocurrencia significa "esta vez no ocurre").
 */
export function virtualOccurrences(
  rules: EngineRule[],
  existing: Pick<EngineTx, "recurrenceRuleId" | "occurrenceDate">[],
  from: ISODate,
  to: ISODate,
): EngineTx[] {
  const taken = new Set(
    existing.filter((t) => t.recurrenceRuleId && t.occurrenceDate).map((t) => `${t.recurrenceRuleId}|${t.occurrenceDate}`),
  );
  const out: EngineTx[] = [];
  for (const rule of rules) {
    if (!rule.active) continue;
    for (const date of occurrences(rule, from, to)) {
      if (taken.has(`${rule.id}|${date}`)) continue;
      out.push({
        id: `virtual:${rule.id}:${date}`,
        kind: rule.kind,
        status: "planned",
        amount: rule.amount,
        currency: rule.currency,
        accountId: rule.accountId,
        toAccountId: rule.toAccountId ?? null,
        toAmount: rule.toAmount ?? null,
        date,
        postedOn: null,
        categoryId: rule.categoryId ?? null,
        nature: rule.nature ?? null,
        recurrenceRuleId: rule.id,
        occurrenceDate: date,
        debtId: rule.debtId ?? null,
        description: rule.description,
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Equivalente mensual de una regla (importe anual / 12), redondeado half-up. */
export function monthlyEquivalent(rule: Pick<EngineRule, "frequency" | "amount">): number {
  if (rule.frequency === "once") return 0;
  return Math.round((rule.amount * OCCURRENCES_PER_YEAR[rule.frequency]) / 12);
}
