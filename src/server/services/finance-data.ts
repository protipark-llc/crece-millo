/**
 * Carga los datos de una persona y los convierte a estructuras del motor.
 * Todos los cálculos (indicadores, flujo, presupuesto, patrimonio) usan esta misma
 * fuente para que los números coincidan entre pantallas.
 */
import type { Tx } from "@/lib/db/client";
import { buildCashflow, accountBalances, postedTotals } from "@/lib/finance/cashflow";
import { addDays, addMonthsClamped, monthEnd, monthStart, todayIn, type ISODate } from "@/lib/finance/dates";
import { amortize, effectiveAnnualFromMonthly, simulatePayoff, type DebtForPlan } from "@/lib/finance/debt";
import { convert } from "@/lib/finance/fx";
import { netWorthAt, debtBalanceAt, type EngineAsset, type EngineDebt } from "@/lib/finance/networth";
import { effectiveDate, type EngineTx, type ExchangeRate } from "@/lib/finance/types";
import { toEngineAccount } from "./accounts";
import { CATEGORY_ORDER, toCategoryRow, toEngineCategories } from "./categories";
import { debtMonthlyRate, groupAssets, groupDebts, groupGoals } from "./planning";
import { getSettings } from "./settings";
import { toEngineRule, toEngineTx } from "./transactions";
import { selectBatch } from "@/lib/db/batch";
import {
  accounts,
  assetValuations,
  assets,
  categories,
  debtPayments,
  debts,
  exchangeRates,
  goalContributions,
  goals,
  recurrenceRules,
  transactions,
} from "@/lib/db/schema";
import { asc, desc, eq } from "drizzle-orm";

export async function loadFinanceData(tx: Tx, userId: string, now: Date = new Date()) {
  const settings = await getSettings(tx, userId);
  const today = todayIn(settings.timezone, now);
  // Una sola consulta para todas las tablas (mismo orden que los list* de cada servicio).
  const b = await selectBatch(tx, {
    accounts: [accounts, tx.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.archivedAt), asc(accounts.createdAt))],
    categories: [categories, tx.select().from(categories).where(eq(categories.userId, userId)).orderBy(...CATEGORY_ORDER)],
    txs: [transactions, tx.select().from(transactions).where(eq(transactions.userId, userId))],
    rules: [recurrenceRules, tx.select().from(recurrenceRules).where(eq(recurrenceRules.userId, userId)).orderBy(desc(recurrenceRules.createdAt))],
    debts: [debts, tx.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.status), asc(debts.createdAt))],
    payments: [debtPayments, tx.select().from(debtPayments).where(eq(debtPayments.userId, userId)).orderBy(desc(debtPayments.paidOn))],
    assets: [assets, tx.select().from(assets).where(eq(assets.userId, userId)).orderBy(asc(assets.createdAt))],
    valuations: [assetValuations, tx.select().from(assetValuations).where(eq(assetValuations.userId, userId)).orderBy(desc(assetValuations.valuedOn))],
    goals: [goals, tx.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.priority), asc(goals.createdAt))],
    contributions: [goalContributions, tx.select().from(goalContributions).where(eq(goalContributions.userId, userId)).orderBy(desc(goalContributions.contributedOn))],
    rates: [exchangeRates, tx.select().from(exchangeRates).where(eq(exchangeRates.userId, userId))],
  });
  const accountRows = b.accounts;
  const categoryRows = b.categories.map(toCategoryRow);
  const txRows = b.txs;
  const ruleRows = b.rules;
  const debtRows = groupDebts(b.debts, b.payments);
  const assetRows = groupAssets(b.assets, b.valuations);
  const goalRows = groupGoals(b.goals, b.contributions);
  const rateRows = b.rates;
  const rates: ExchangeRate[] = rateRows.map((r) => ({ from: r.fromCurrency, to: r.toCurrency, rate: Number(r.rate), asOf: r.asOf }));
  const engineDebts: EngineDebt[] = debtRows.map(({ debt, payments }) => ({
    id: debt.id,
    name: debt.name,
    currency: debt.currency,
    openingBalance: debt.openingBalance,
    balanceDate: debt.balanceDate,
    securedAssetId: debt.securedAssetId,
    payments: payments.map((p) => ({ date: p.paidOn, principal: p.principal })),
  }));
  const engineAssets: EngineAsset[] = assetRows
    .filter((a) => !a.asset.archivedAt)
    .map(({ asset, valuations }) => ({
      id: asset.id,
      name: asset.name,
      type: asset.type,
      currency: asset.currency,
      liquidity: asset.liquidity,
      valuations: valuations.map((v) => ({ value: v.value, valuedOn: v.valuedOn, source: v.source })),
    }));
  return {
    settings,
    today,
    base: settings.currency,
    locale: settings.locale,
    rates,
    accountRows,
    accounts: accountRows.map(toEngineAccount),
    categoryRows,
    categories: toEngineCategories(categoryRows),
    txRows,
    txs: txRows.map(toEngineTx),
    ruleRows,
    rules: ruleRows.map(toEngineRule),
    debtRows,
    engineDebts,
    assetRows,
    engineAssets,
    goalRows,
  };
}

export type FinanceData = Awaited<ReturnType<typeof loadFinanceData>>;

/** Saldo pendiente de cada deuda hoy, con tasa mensual y EA. */
export function debtSummaries(d: FinanceData) {
  return d.debtRows.map(({ debt, payments }) => {
    const engine = d.engineDebts.find((e) => e.id === debt.id)!;
    const balance = debtBalanceAt(engine, d.today) ?? debt.openingBalance;
    const m = debtMonthlyRate(debt);
    return {
      debt,
      payments,
      balance,
      monthlyRate: m,
      ea: m === null ? null : effectiveAnnualFromMonthly(m),
      interestPaid: payments.reduce((s, p) => s + p.interest, 0),
      principalPaid: payments.reduce((s, p) => s + p.principal, 0),
    };
  });
}

export function debtsForPlan(d: FinanceData): DebtForPlan[] {
  return debtSummaries(d)
    .filter((s) => s.debt.status === "active" && s.balance > 0)
    .map((s) => ({
      id: s.debt.id,
      name: s.debt.name,
      balance: convert(s.balance, s.debt.currency, d.base, d.rates, d.today) ?? 0,
      monthlyRate: s.monthlyRate,
      minimumPayment: s.debt.minimumPayment === null ? null : (convert(s.debt.minimumPayment, s.debt.currency, d.base, d.rates, d.today) ?? 0),
      monthlyFees: convert(s.debt.monthlyFees, s.debt.currency, d.base, d.rates, d.today) ?? 0,
      customPriority: s.debt.customPriority,
    }));
}

export function liquidBalance(d: FinanceData): number {
  return accountBalances(d.accounts.filter((a) => a.isLiquid && !a.archived), d.txs, [], d.today, d.today).reduce(
    (s, b, i) => s + (convert(b.registered, d.accounts.filter((a) => a.isLiquid && !a.archived)[i]!.currency, d.base, d.rates, d.today) ?? 0),
    0,
  );
}

function natureOf(d: FinanceData, tx: EngineTx): "essential" | "discretionary" | null {
  if (tx.nature) return tx.nature;
  let c = tx.categoryId ? d.categories.find((x) => x.id === tx.categoryId) : undefined;
  while (c) {
    if (c.nature) return c.nature;
    c = c.parentId ? d.categories.find((x) => x.id === c!.parentId) : undefined;
  }
  return null;
}

function isDebtPayment(d: FinanceData, tx: EngineTx): boolean {
  if (tx.debtId) return true;
  let c = tx.categoryId ? d.categories.find((x) => x.id === tx.categoryId) : undefined;
  while (c) {
    if (c.systemKey === "debts") return true;
    c = c.parentId ? d.categories.find((x) => x.id === c!.parentId) : undefined;
  }
  return false;
}

function inSystemGroup(d: FinanceData, categoryId: string | null | undefined, key: string): boolean {
  let c = categoryId ? d.categories.find((x) => x.id === categoryId) : undefined;
  while (c) {
    if (c.systemKey === key) return true;
    c = c.parentId ? d.categories.find((x) => x.id === c!.parentId) : undefined;
  }
  return false;
}

/** Totales de un periodo con desglose esencial / discrecional / sin clasificar. */
export function periodBreakdown(d: FinanceData, from: ISODate, to: ISODate) {
  const totals = postedTotals(d.txs, from, to, d.base, d.rates);
  let essential = 0;
  let discretionary = 0;
  let unclassified = 0;
  let debtPayments = 0;
  let uncategorized = 0;
  for (const tx of d.txs) {
    if (tx.kind !== "expense" || tx.status !== "posted") continue;
    const date = effectiveDate(tx);
    if (date < from || date > to) continue;
    const v = convert(tx.amount, tx.currency, d.base, d.rates, date) ?? 0;
    const n = natureOf(d, tx);
    if (n === "essential") essential += v;
    else if (n === "discretionary") discretionary += v;
    else unclassified += v;
    if (isDebtPayment(d, tx)) debtPayments += v;
    if (!tx.categoryId) uncategorized++;
  }
  return { ...totals, essential, discretionary, unclassified, debtPayments, uncategorized };
}

/**
 * Referencias mensuales: promedio de los últimos 3 meses COMPLETOS con datos.
 * Si no hay historia, se usa el equivalente mensual de las recurrencias activas.
 */
export function monthlyReferences(d: FinanceData) {
  const months: ReturnType<typeof periodBreakdown>[] = [];
  for (let i = 1; i <= 3; i++) {
    const start = addMonthsClamped(monthStart(d.today), -i, 1);
    const b = periodBreakdown(d, start, monthEnd(start));
    if (b.income > 0 || b.expense > 0) months.push(b);
  }
  const avg = (f: (b: ReturnType<typeof periodBreakdown>) => number) =>
    months.length ? Math.round(months.reduce((s, b) => s + f(b), 0) / months.length) : null;
  let income = avg((b) => b.income);
  let essentialNoDebt = avg((b) => b.essential - Math.min(b.debtPayments, b.essential));
  let discretionary = avg((b) => b.discretionary + b.unclassified);
  let essential = avg((b) => b.essential);
  let source: "history" | "recurring" | "none" = months.length ? "history" : "none";
  if (!months.length) {
    // Proyección del mes en curso según recurrencias y previstos.
    const cf = buildCashflow({
      accounts: d.accounts,
      txs: d.txs,
      rules: d.rules,
      from: monthStart(addMonthsClamped(d.today, 1, 1)),
      to: monthEnd(addMonthsClamped(d.today, 1, 1)),
      today: d.today,
      granularity: "month",
      baseCurrency: d.base,
      rates: d.rates,
      accountFilter: () => true,
    });
    const b = cf.buckets[0];
    if (b && (b.projectedIncome > 0 || b.projectedExpense > 0)) {
      income = b.projectedIncome;
      essential = b.projectedExpense;
      essentialNoDebt = b.projectedExpense;
      discretionary = 0;
      source = "recurring";
    }
  }
  return { income, essential, essentialNoDebt, discretionary, monthsUsed: months.length, source };
}

export function goalsSummary(d: FinanceData) {
  const active = d.goalRows.filter((g) => g.goal.status === "active" || g.goal.status === "paused");
  const achieved = d.goalRows.filter((g) => g.goal.status === "achieved");
  const committed = d.goalRows
    .filter((g) => g.goal.status !== "archived")
    .reduce((s, g) => s + (convert(g.accumulated, g.goal.currency, d.base, d.rates, d.today) ?? 0), 0);
  const emergency = d.goalRows.filter((g) => g.goal.type === "emergency_fund" && g.goal.status !== "archived");
  const emergencyFund = emergency.length
    ? emergency.reduce((s, g) => s + (convert(g.accumulated, g.goal.currency, d.base, d.rates, d.today) ?? 0), 0)
    : null;
  const emergencyTargetMonths = emergency[0]?.goal.emergencyMonthsTarget ?? d.settings.emergencyMonthsTarget ?? null;
  return { active, achieved, committed, emergencyFund, emergencyTargetMonths };
}

export function netWorthNow(d: FinanceData, date: ISODate = d.today) {
  return netWorthAt(date, { accounts: d.accounts, txs: d.txs, assets: d.engineAssets, debts: d.engineDebts }, d.base, d.rates);
}

export function subscriptionsMonthly(d: FinanceData): number {
  const ref = monthlyReferences(d);
  let total = 0;
  const start = addMonthsClamped(monthStart(d.today), -3, 1);
  const end = addDays(monthStart(d.today), -1);
  for (const tx of d.txs) {
    if (tx.kind !== "expense" || tx.status !== "posted") continue;
    const date = effectiveDate(tx);
    if (date < start || date > end || !inSystemGroup(d, tx.categoryId, "subscriptions")) continue;
    total += convert(tx.amount, tx.currency, d.base, d.rates, date) ?? 0;
  }
  return ref.monthsUsed ? Math.round(total / Math.max(1, ref.monthsUsed)) : 0;
}

export function avalancheComparison(d: FinanceData, extra: number) {
  const plan = debtsForPlan(d);
  if (!plan.length) return null;
  const min = simulatePayoff(plan, "minimum");
  const ava = simulatePayoff(plan, "avalanche", extra);
  return { min, ava, interestSaved: min.feasible && ava.feasible ? min.totalInterest - ava.totalInterest : null };
}

/**
 * Estimaciones para proyectar la caja más allá de lo programado:
 * - Gasto variable mensual = promedio de los últimos 3 meses completos con datos de gastos
 *   realizados que NO vienen de una recurrencia ni son pagos de deudas.
 * - Cuotas mínimas de deudas activas en su día de pago (día 1 si no se conoce), hasta que la
 *   amortización estimada termine; si ya hubo un pago este mes, se empieza el mes siguiente.
 */
export function cashflowEstimates(d: FinanceData, horizonMonths = 24) {
  const notes: string[] = [];
  let total = 0;
  let monthsWithData = 0;
  for (let i = 1; i <= 3; i++) {
    const start = addMonthsClamped(monthStart(d.today), -i, 1);
    const end = monthEnd(start);
    let m = 0;
    let any = false;
    for (const tx of d.txs) {
      if (tx.kind !== "expense" || tx.status !== "posted") continue;
      const date = effectiveDate(tx);
      if (date < start || date > end) continue;
      any = true;
      if (tx.recurrenceRuleId || isDebtPayment(d, tx)) continue;
      m += convert(tx.amount, tx.currency, d.base, d.rates, date) ?? 0;
    }
    if (any) {
      total += m;
      monthsWithData++;
    }
  }
  const variableExpenseMonthly = monthsWithData ? Math.round(total / monthsWithData) : 0;
  notes.push(
    monthsWithData
      ? `Gasto variable estimado: promedio de ${monthsWithData} mes(es) de gastos no programados.`
      : "Sin historial suficiente para estimar el gasto variable: la proyección solo incluye lo programado.",
  );
  const debtPayments: { date: ISODate; amount: number }[] = [];
  for (const s of debtSummaries(d)) {
    const min = s.debt.minimumPayment;
    if (s.debt.status !== "active" || !min || s.balance <= 0) continue;
    const day = s.debt.paymentDay ?? 1;
    const paidThisMonth = s.payments.some((p) => p.paidOn >= monthStart(d.today));
    let first = addMonthsClamped(monthStart(d.today), paidThisMonth ? 1 : 0, day);
    if (first < d.today) first = d.today;
    const months = s.monthlyRate !== null ? amortize(s.balance, s.monthlyRate, min, s.debt.monthlyFees, horizonMonths) : null;
    const count = months && months.status === "paid_off" ? months.months : horizonMonths;
    for (let i = 0; i < count; i++) {
      const date = i === 0 ? first : addMonthsClamped(monthStart(first), i, day);
      const amount = i === count - 1 && months?.status === "paid_off" ? months.schedule[i]!.payment : min;
      debtPayments.push({ date, amount: convert(amount, s.debt.currency, d.base, d.rates, d.today) ?? 0 });
    }
  }
  if (debtPayments.length) notes.push("Cuotas mínimas de tus deudas activas en su día de pago.");
  return { variableExpenseMonthly, debtPayments, notes };
}
