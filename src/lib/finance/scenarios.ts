/**
 * Simulador de escenarios. Función pura: recibe una COPIA de la línea base y unos
 * supuestos, y devuelve series mensuales. Nunca escribe en la base de datos ni
 * modifica movimientos reales.
 *
 * Mes t (t = 1..H):
 *   ingreso_t   = ingreso_base × (1 + Δingreso) − pérdida_de_ingreso_t (acotada a ≥ 0)
 *   gasto_t     = (esenciales + discrecionales) × (1 + Δgasto) + nueva_cuota_t + compra_t
 *   deuda_t     = pagos de deudas según estrategia (mínimos + extra, con efecto bola de nieve)
 *   caja_t      = caja_{t−1} × (1 + i_m si caja > 0) + ingreso_t − gasto_t − deuda_t
 *   patrimonio_t= caja_t + otros activos (constantes, sin valorización supuesta) − saldo de deudas_t
 * Los gastos base EXCLUYEN pagos de deudas para no contarlos dos veces: las deudas se
 * modelan aparte con su tasa y su cuota.
 */
import { applyPercentChange, roundMinor, type Minor } from "@/lib/money/money";
import { addMonthsClamped, type ISODate } from "./dates";
import { simulatePayoff, type DebtForPlan, type Strategy } from "./debt";

export interface ScenarioBaseline {
  startDate: ISODate;
  liquidBalance: Minor;
  monthlyIncome: Minor;
  monthlyEssential: Minor;
  monthlyDiscretionary: Minor;
  otherAssets: Minor;
  debts: DebtForPlan[];
}

export interface ScenarioAssumptions {
  horizonMonths: number;
  incomeChangePct: number;
  expenseChangePct: number;
  incomeLoss: { amount: Minor; startMonth: number; months: number } | null;
  newMonthlyPayment: { amount: Minor; startMonth: number; months: number } | null;
  oneOffPurchase: { amount: Minor; month: number } | null;
  extraDebtPayment: Minor;
  debtStrategy: Exclude<Strategy, "custom">;
  /** Rendimiento anual supuesto de la caja positiva. 0 por defecto: no se asume ningún rendimiento. */
  cashAnnualReturnPct: number;
}

export const DEFAULT_ASSUMPTIONS: ScenarioAssumptions = {
  horizonMonths: 12,
  incomeChangePct: 0,
  expenseChangePct: 0,
  incomeLoss: null,
  newMonthlyPayment: null,
  oneOffPurchase: null,
  extraDebtPayment: 0,
  debtStrategy: "avalanche",
  cashAnnualReturnPct: 0,
};

export interface ScenarioMonth {
  month: number;
  date: ISODate;
  income: Minor;
  expenses: Minor;
  debtPayments: Minor;
  net: Minor;
  cash: Minor;
  debt: Minor;
  netWorth: Minor;
}

export interface ScenarioResult {
  months: ScenarioMonth[];
  finalCash: Minor;
  finalDebt: Minor;
  finalNetWorth: Minor;
  firstNegativeMonth: number | null;
  minCash: Minor;
  totalInterest: Minor;
  debtFreeMonth: number | null;
  warnings: string[];
}

export function runScenario(base: ScenarioBaseline, a: ScenarioAssumptions): ScenarioResult {
  const H = Math.max(1, Math.min(120, Math.round(a.horizonMonths)));
  const debtPlan = simulatePayoff(base.debts, a.extraDebtPayment > 0 ? a.debtStrategy : "minimum", a.extraDebtPayment, 600);
  const monthlyReturn = a.cashAnnualReturnPct > 0 ? Math.pow(1 + a.cashAnnualReturnPct / 100, 1 / 12) - 1 : 0;
  const warnings = [...debtPlan.warnings];
  if (a.cashAnnualReturnPct > 0) {
    warnings.push(
      `Se supone un rendimiento de ${a.cashAnnualReturnPct} % anual sobre la caja positiva. Es un supuesto, no una garantía: los rendimientos reales varían y pueden ser negativos.`,
    );
  }
  const baseIncome = applyPercentChange(base.monthlyIncome, a.incomeChangePct);
  const baseExpenses = applyPercentChange(base.monthlyEssential + base.monthlyDiscretionary, a.expenseChangePct);

  const months: ScenarioMonth[] = [];
  let cash = base.liquidBalance;
  let firstNegativeMonth: number | null = null;
  let minCash = cash;
  let totalInterestShare = 0;
  for (let t = 1; t <= H; t++) {
    const inWindow = (w: { startMonth: number; months: number } | null) =>
      !!w && t >= w.startMonth && t < w.startMonth + w.months;
    let income = baseIncome;
    if (a.incomeLoss && inWindow(a.incomeLoss)) income = Math.max(0, income - a.incomeLoss.amount);
    let expenses = baseExpenses;
    if (a.newMonthlyPayment && inWindow(a.newMonthlyPayment)) expenses += a.newMonthlyPayment.amount;
    if (a.oneOffPurchase && a.oneOffPurchase.month === t) expenses += a.oneOffPurchase.amount;
    const debtPayments = debtPlan.paymentSeries[t - 1] ?? 0;
    const growth = cash > 0 ? roundMinor(cash * monthlyReturn) : 0;
    const net = income - expenses - debtPayments;
    cash = cash + growth + net;
    const debt = debtPlan.balanceSeries[Math.min(t, debtPlan.balanceSeries.length - 1)] ?? 0;
    if (cash < 0 && firstNegativeMonth === null) firstNegativeMonth = t;
    minCash = Math.min(minCash, cash);
    months.push({
      month: t,
      date: addMonthsClamped(base.startDate, t, 1),
      income,
      expenses,
      debtPayments,
      net,
      cash,
      debt,
      netWorth: cash + base.otherAssets - debt,
    });
  }
  if (debtPlan.months !== null && debtPlan.months > 0) {
    totalInterestShare = debtPlan.totalInterest;
  }
  const last = months[months.length - 1]!;
  return {
    months,
    finalCash: last.cash,
    finalDebt: last.debt,
    finalNetWorth: last.netWorth,
    firstNegativeMonth,
    minCash,
    totalInterest: totalInterestShare,
    debtFreeMonth: debtPlan.feasible && debtPlan.months !== null ? debtPlan.months : null,
    warnings,
  };
}

export interface VariantDeltas {
  favorable: { incomePct: number; expensePct: number };
  unfavorable: { incomePct: number; expensePct: number };
}

export const DEFAULT_VARIANTS: VariantDeltas = {
  favorable: { incomePct: 5, expensePct: -5 },
  unfavorable: { incomePct: -10, expensePct: 10 },
};

export function runVariants(base: ScenarioBaseline, a: ScenarioAssumptions, deltas: VariantDeltas = DEFAULT_VARIANTS) {
  return {
    base: runScenario(base, a),
    favorable: runScenario(base, {
      ...a,
      incomeChangePct: a.incomeChangePct + deltas.favorable.incomePct,
      expenseChangePct: a.expenseChangePct + deltas.favorable.expensePct,
    }),
    unfavorable: runScenario(base, {
      ...a,
      incomeChangePct: a.incomeChangePct + deltas.unfavorable.incomePct,
      expenseChangePct: a.expenseChangePct + deltas.unfavorable.expensePct,
    }),
  };
}

/** Impacto de cada supuesto en la caja final: se compara contra el escenario sin ese supuesto. */
export function scenarioDrivers(base: ScenarioBaseline, a: ScenarioAssumptions) {
  const full = runScenario(base, a).finalCash;
  const candidates: { key: string; label: string; neutral: Partial<ScenarioAssumptions>; active: boolean }[] = [
    { key: "income", label: "Cambio en ingresos", neutral: { incomeChangePct: 0 }, active: a.incomeChangePct !== 0 },
    { key: "expense", label: "Cambio en gastos", neutral: { expenseChangePct: 0 }, active: a.expenseChangePct !== 0 },
    { key: "loss", label: "Pérdida temporal de ingresos", neutral: { incomeLoss: null }, active: !!a.incomeLoss },
    { key: "payment", label: "Nueva cuota mensual", neutral: { newMonthlyPayment: null }, active: !!a.newMonthlyPayment },
    { key: "purchase", label: "Compra importante", neutral: { oneOffPurchase: null }, active: !!a.oneOffPurchase },
    { key: "extra", label: "Abono extra a deudas", neutral: { extraDebtPayment: 0 }, active: a.extraDebtPayment > 0 },
    { key: "return", label: "Rendimiento supuesto de la caja", neutral: { cashAnnualReturnPct: 0 }, active: a.cashAnnualReturnPct > 0 },
  ];
  return candidates
    .filter((c) => c.active)
    .map((c) => ({ key: c.key, label: c.label, impactOnCash: full - runScenario(base, { ...a, ...c.neutral }).finalCash }))
    .sort((x, y) => Math.abs(y.impactOnCash) - Math.abs(x.impactOnCash));
}
