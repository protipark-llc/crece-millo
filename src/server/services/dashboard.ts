/** Composición del panel: indicadores, recomendaciones y próximos pagos. */
import { buildCashflow, OVERDUE_LOOKBACK_DAYS } from "@/lib/finance/cashflow";
import { computeBudget } from "@/lib/finance/budget";
import { addDays, addMonthsClamped, monthEnd, monthStart, type ISODate } from "@/lib/finance/dates";
import { computeIndicators } from "@/lib/finance/indicators";
import { buildInsights } from "@/lib/finance/insights";
import { virtualOccurrences } from "@/lib/finance/recurrence";
import type { Tx } from "@/lib/db/client";
import { formatters } from "../format";
import { getBudgetForMonth } from "./budgets";
import { categoryLabel } from "./categories";
import {
  avalancheComparison,
  cashflowEstimates,
  debtSummaries,
  goalsSummary,
  liquidBalance,
  monthlyReferences,
  netWorthNow,
  periodBreakdown,
  subscriptionsMonthly,
  type FinanceData,
} from "./finance-data";

export async function buildOverview(tx: Tx, userId: string, d: FinanceData) {
  const f = formatters(d.base, d.locale);
  const mStart = monthStart(d.today);
  const current = periodBreakdown(d, mStart, d.today);
  const prevStart = addMonthsClamped(mStart, -1, 1);
  const prev = periodBreakdown(d, prevStart, monthEnd(prevStart));
  const refs = monthlyReferences(d);
  const goals = goalsSummary(d);
  const debts = debtSummaries(d).filter((s) => s.debt.status === "active");
  const nw = netWorthNow(d);
  const nwPrevMonth = netWorthNow(d, addDays(mStart, -1));
  const nwPrevYear = netWorthNow(d, addMonthsClamped(d.today, -12));
  const budgetRow = await getBudgetForMonth(tx, userId, mStart);
  const estimates = cashflowEstimates(d);
  const debtsCat = d.categoryRows.find((c) => c.systemKey === "debts")?.id ?? null;
  const budget = budgetRow
    ? computeBudget({
        month: mStart,
        today: d.today,
        lines: budgetRow.lines.map((l) => ({ id: l.id, categoryId: l.categoryId, planned: l.planned })),
        categories: d.categories,
        txs: d.txs,
        rules: d.rules,
        baseCurrency: d.base,
        rates: d.rates,
        expectedIncome: budgetRow.budget.expectedIncome,
        savingsTarget: budgetRow.budget.savingsTarget,
        externalCommitted: estimates.debtPayments.filter((p) => p.date.slice(0, 7) === mStart.slice(0, 7)).map((p) => ({ categoryId: debtsCat, amount: p.amount })),
      })
    : null;
  const horizon = addDays(d.today, 90);
  const cash90 = buildCashflow({ accounts: d.accounts, txs: d.txs, rules: d.rules, from: d.today, to: horizon, today: d.today, granularity: "week", baseCurrency: d.base, rates: d.rates, estimates });
  const monthlyDebt = debts.length ? debts.reduce((s, x) => s + (x.debt.minimumPayment ?? 0), 0) : null;
  const essentialRef = refs.essential;
  const indicators = computeIndicators({
    periodLabel: `${f.month(mStart)} (hasta hoy)`,
    income: current.income,
    expenses: current.expense,
    essential: current.essential,
    discretionary: current.discretionary,
    unclassified: current.unclassified,
    budgetPlanned: budget ? budget.totalPlanned : null,
    budgetExecuted: budget ? budget.totalExecuted : null,
    cashBalance: liquidBalance(d),
    hasAccounts: d.accounts.length > 0,
    monthlyDebtPayments: monthlyDebt,
    totalDebt: debts.reduce((s, x) => s + x.balance, 0),
    monthlyNetIncomeReference: refs.income,
    emergencyFund: goals.emergencyFund,
    essentialMonthlyReference: essentialRef,
    netWorth: nw.hasData ? nw.netWorth : null,
    netWorthPrevMonth: nwPrevMonth.hasData ? nwPrevMonth.netWorth : null,
    netWorthPrevYear: nwPrevYear.hasData ? nwPrevYear.netWorth : null,
    goalsAchieved: goals.achieved.length,
    goalsActive: goals.active.length,
  });
  const comparison = avalancheComparison(d, refs.income ? Math.round(refs.income * 0.05) : 0);
  const insights = buildInsights({
    fmt: f.money,
    fmtPct: (v) => f.pct(v),
    fmtDate: (x) => f.date(x, "long"),
    hasAccounts: d.accounts.length > 0,
    hasIncome: d.txs.some((t) => t.kind === "income") || d.rules.some((r) => r.kind === "income"),
    hasBudget: !!budgetRow,
    firstNegativeDate: cash90.firstNegativeDate,
    lowestBalance: cash90.lowestBalance,
    daysAhead: 90,
    overdueCount: upcoming(d, 0).filter((u) => u.overdue).length,
    overLimitLines: budget
      ? budget.lines.filter((l) => l.overLimit && l.planned > 0).map((l) => ({ name: categoryLabel(d.categoryRows, l.categoryId), planned: l.planned, executed: l.executed }))
      : [],
    lastMonth: prev.income > 0 || prev.expense > 0 ? { income: prev.income, expenses: prev.expense } : null,
    emergency:
      goals.emergencyFund !== null
        ? { fund: goals.emergencyFund, essentialMonthly: essentialRef, targetMonths: goals.emergencyTargetMonths ?? 3 }
        : null,
    debts: debts.map((x) => ({ name: x.debt.name, ea: x.ea, balance: x.balance, daysPastDue: x.debt.daysPastDue, minimumPayment: x.debt.minimumPayment })),
    avalancheSavings:
      comparison && comparison.interestSaved && comparison.interestSaved > 0 && comparison.ava.monthlyBudget > 0
        ? {
            interestSaved: comparison.interestSaved,
            monthsSaved: comparison.min.months && comparison.ava.months ? comparison.min.months - comparison.ava.months : null,
            extra: refs.income ? Math.round(refs.income * 0.05) : 0,
          }
        : null,
    debtServiceRatio: monthlyDebt !== null && refs.income ? monthlyDebt / refs.income : null,
    subscriptionsMonthly: subscriptionsMonthly(d),
    monthlyIncomeReference: refs.income,
    uncategorizedCount: d.txs.filter((t) => t.kind === "expense" && !t.categoryId && t.status !== "cancelled").length,
  });
  return { current, prev, refs, goals, debts, nw, budget, cash90, estimates, indicators, insights };
}

export interface UpcomingItem {
  key: string;
  date: ISODate;
  description: string;
  kind: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  accountId: string;
  categoryId: string | null;
  overdue: boolean;
  /** Si viene de una recurrencia sin materializar. */
  ruleId: string | null;
  txId: string | null;
}

/** Movimientos previstos (guardados y recurrentes) entre hoy y `days` días, más los vencidos. */
export function upcoming(d: FinanceData, days = 30): UpcomingItem[] {
  const to = addDays(d.today, days);
  const saved = d.txs
    .filter((t) => t.status === "planned" && t.date <= to)
    .map((t) => ({ key: t.id, date: t.date, description: t.description ?? "", kind: t.kind, amount: t.amount, currency: t.currency, accountId: t.accountId, categoryId: t.categoryId ?? null, overdue: t.date < d.today, ruleId: null, txId: t.id }));
  const virtual = virtualOccurrences(d.rules, d.txs, d.today, to).map((t) => ({
    key: t.id,
    date: t.date,
    description: t.description ?? "",
    kind: t.kind,
    amount: t.amount,
    currency: t.currency,
    accountId: t.accountId,
    categoryId: t.categoryId ?? null,
    overdue: false,
    ruleId: t.recurrenceRuleId ?? null,
    txId: null,
  }));
  // Ocurrencias recurrentes vencidas (antes de hoy, no registradas): misma ventana que el flujo de caja.
  const missed = virtualOccurrences(d.rules, d.txs, addDays(d.today, -OVERDUE_LOOKBACK_DAYS), addDays(d.today, -1)).map((t) => ({
    key: t.id,
    date: t.date,
    description: t.description ?? "",
    kind: t.kind,
    amount: t.amount,
    currency: t.currency,
    accountId: t.accountId,
    categoryId: t.categoryId ?? null,
    overdue: true,
    ruleId: t.recurrenceRuleId ?? null,
    txId: null,
  }));
  return [...missed, ...saved, ...virtual].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}
