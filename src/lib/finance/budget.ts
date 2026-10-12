/**
 * Presupuesto mensual frente a ejecución real.
 *
 * - Ejecutado(línea)   = gastos REALIZADOS del mes cuya categoría es la de la línea o una
 *   subcategoría sin línea propia (cada gasto se asigna a UNA sola línea: la más específica).
 * - Comprometido       = gastos PREVISTOS pendientes del mes en esa línea (guardados o recurrentes).
 * - Saldo              = presupuestado − ejecutado.
 * - % de ejecución     = ejecutado / presupuestado (null si presupuestado = 0).
 * - Desviación         = ejecutado − presupuestado (positiva = exceso).
 * - Proyección al cierre (mes en curso):
 *     fijos     → ejecutado + comprometido
 *     variables → máx(ejecutado + comprometido, ejecutado + promedio mensual histórico de la
 *                 línea (3 meses previos) × fracción de días restantes). Sin historia, se usa el
 *                 ritmo diario × días del mes (a partir del día 5).
 *   Meses cerrados o futuros → ejecutado + comprometido.
 * - Sin asignar        = ingreso esperado − total presupuestado en gastos − meta de ahorro.
 * El presupuesto NO es dinero disponible: es un plan. El dinero disponible está en las cuentas.
 */
import { add, type Minor } from "@/lib/money/money";
import { addMonthsClamped, daysInMonth, diffDays, monthEnd, monthStart, parts, type ISODate } from "./dates";
import { convert } from "./fx";
import { virtualOccurrences } from "./recurrence";
import { effectiveDate, type EngineCategory, type EngineRule, type EngineTx, type ExchangeRate } from "./types";

export interface BudgetLineInput {
  id: string;
  categoryId: string;
  planned: Minor;
}

export interface BudgetLineResult {
  lineId: string | null;
  categoryId: string | null;
  planned: Minor;
  executed: Minor;
  committed: Minor;
  remaining: Minor;
  executionPct: number | null;
  variance: Minor;
  projectedClose: Minor;
  overLimit: boolean;
  projectedOverLimit: boolean;
}

export interface BudgetSummary {
  month: ISODate;
  lines: BudgetLineResult[];
  unbudgeted: BudgetLineResult;
  totalPlanned: Minor;
  totalExecuted: Minor;
  totalCommitted: Minor;
  totalProjected: Minor;
  executionPct: number | null;
  expectedIncome: Minor;
  actualIncome: Minor;
  savingsTarget: Minor;
  unassigned: Minor;
  /** Ahorro real del mes = ingresos realizados − gastos realizados. */
  actualSavings: Minor;
  overLimitCount: number;
}

export function resolveLineCategory(
  categoryId: string | null | undefined,
  lineByCategory: Map<string, string>,
  categories: Map<string, EngineCategory>,
): string | null {
  let current = categoryId ?? null;
  let guard = 0;
  while (current && guard++ < 20) {
    if (lineByCategory.has(current)) return current;
    current = categories.get(current)?.parentId ?? null;
  }
  return null;
}

export function computeBudget(input: {
  month: ISODate;
  today: ISODate;
  lines: BudgetLineInput[];
  categories: EngineCategory[];
  txs: EngineTx[];
  rules: EngineRule[];
  baseCurrency: string;
  rates?: ExchangeRate[];
  expectedIncome?: Minor | null;
  savingsTarget?: Minor;
  /** Compromisos no guardados como movimientos (p. ej. cuotas estimadas de deudas del mes). */
  externalCommitted?: { categoryId: string | null; amount: Minor }[];
}): BudgetSummary {
  const from = monthStart(input.month);
  const to = monthEnd(input.month);
  const rates = input.rates ?? [];
  const catMap = new Map(input.categories.map((c) => [c.id, c]));
  const lineByCategory = new Map(input.lines.map((l) => [l.categoryId, l.id]));
  const executed = new Map<string | null, Minor>();
  const committed = new Map<string | null, Minor>();
  let actualIncome = 0;
  let plannedIncome = 0;

  const toBase = (tx: EngineTx, date: ISODate) => convert(tx.amount, tx.currency, input.baseCurrency, rates, date) ?? 0;
  const bump = (map: Map<string | null, Minor>, key: string | null, amount: Minor) =>
    map.set(key, add(map.get(key) ?? 0, amount));

  const pending = [
    ...input.txs.filter((t) => t.status === "planned"),
    ...virtualOccurrences(input.rules, input.txs, from, to),
  ];

  for (const tx of input.txs) {
    if (tx.status !== "posted" || tx.kind === "transfer") continue;
    const d = effectiveDate(tx);
    if (d < from || d > to) continue;
    if (tx.kind === "income") {
      actualIncome = add(actualIncome, toBase(tx, d));
      continue;
    }
    bump(executed, resolveLineCategory(tx.categoryId, lineByCategory, catMap), toBase(tx, d));
  }
  for (const tx of pending) {
    if (tx.kind === "transfer") continue;
    // Los previstos vencidos de meses anteriores no se imputan a este mes.
    if (tx.date < from || tx.date > to) continue;
    if (tx.kind === "income") {
      plannedIncome = add(plannedIncome, toBase(tx, tx.date));
      continue;
    }
    bump(committed, resolveLineCategory(tx.categoryId, lineByCategory, catMap), toBase(tx, tx.date));
  }

  for (const c of input.externalCommitted ?? []) {
    bump(committed, resolveLineCategory(c.categoryId, lineByCategory, catMap), c.amount);
  }

  // Promedio histórico por línea (3 meses previos con gasto) para proyectar categorías variables.
  const history = new Map<string | null, Minor>();
  const histMonths = new Set<string>();
  const histFrom = addMonthsClamped(from, -3, 1);
  for (const tx of input.txs) {
    if (tx.status !== "posted" || tx.kind !== "expense") continue;
    const d = effectiveDate(tx);
    if (d < histFrom || d >= from) continue;
    histMonths.add(d.slice(0, 7));
    bump(history, resolveLineCategory(tx.categoryId, lineByCategory, catMap), toBase(tx, d));
  }
  const nHist = histMonths.size;

  const { y, m } = parts(from);
  const dim = daysInMonth(y, m);
  const inProgress = input.today >= from && input.today <= to;
  const daysElapsed = inProgress ? diffDays(input.today, from) + 1 : input.today > to ? dim : 0;

  const lineResult = (lineId: string | null, categoryId: string | null, planned: Minor): BudgetLineResult => {
    const ex = executed.get(categoryId) ?? 0;
    const com = committed.get(categoryId) ?? 0;
    const behavior = categoryId ? catMap.get(categoryId)?.behavior : null;
    let projectedClose = ex + com;
    if (behavior !== "fixed" && inProgress) {
      const hist = nHist ? (history.get(categoryId) ?? 0) / nHist : null;
      if (hist !== null && hist > 0) {
        projectedClose = Math.max(projectedClose, ex + Math.round((hist * (dim - daysElapsed)) / dim));
      } else if (hist === null && daysElapsed >= 5) {
        projectedClose = Math.max(projectedClose, Math.round((ex / daysElapsed) * dim));
      }
    }
    return {
      lineId,
      categoryId,
      planned,
      executed: ex,
      committed: com,
      remaining: planned - ex,
      executionPct: planned > 0 ? ex / planned : null,
      variance: ex - planned,
      projectedClose,
      overLimit: ex > planned,
      projectedOverLimit: projectedClose > planned,
    };
  };

  const lines = input.lines.map((l) => lineResult(l.id, l.categoryId, l.planned));
  const unbudgeted = lineResult(null, null, 0);
  const totalPlanned = lines.reduce((s, l) => s + l.planned, 0);
  const totalExecuted = lines.reduce((s, l) => s + l.executed, 0) + unbudgeted.executed;
  const totalCommitted = lines.reduce((s, l) => s + l.committed, 0) + unbudgeted.committed;
  const totalProjected = lines.reduce((s, l) => s + l.projectedClose, 0) + unbudgeted.projectedClose;
  const expectedIncome = input.expectedIncome ?? actualIncome + plannedIncome;
  const savingsTarget = input.savingsTarget ?? 0;
  return {
    month: from,
    lines,
    unbudgeted,
    totalPlanned,
    totalExecuted,
    totalCommitted,
    totalProjected,
    executionPct: totalPlanned > 0 ? totalExecuted / totalPlanned : null,
    expectedIncome,
    actualIncome,
    savingsTarget,
    unassigned: expectedIncome - totalPlanned - savingsTarget,
    actualSavings: actualIncome - totalExecuted,
    overLimitCount: lines.filter((l) => l.overLimit).length,
  };
}

/** Plantillas educativas opcionales: devuelven porcentajes sugeridos, no imposiciones. */
export const BUDGET_TEMPLATES = {
  zero_based: {
    name: "Base cero",
    description:
      "Asignas cada peso del ingreso esperado a un gasto, una meta o el ahorro hasta que 'sin asignar' quede en cero. Útil para tener control total.",
    split: null,
  },
  pay_yourself_first: {
    name: "Págate primero",
    description:
      "Antes de distribuir los gastos reservas un porcentaje para ahorro (por ejemplo 10 %). Es el orden que propone la tabla de flujo de caja del libro de referencia: Ahorros va en la primera fila.",
    split: { savings: 10, essential: 60, discretionary: 30 },
  },
  fifty_thirty_twenty: {
    name: "50 / 30 / 20",
    description:
      "Referencia popular: 50 % necesidades, 30 % deseos, 20 % ahorro y pago extra de deudas. Con ingresos bajos o costos de vivienda altos puede no ser realista; ajústala a tu caso.",
    split: { savings: 20, essential: 50, discretionary: 30 },
  },
} as const;
