/**
 * Indicadores financieros. Cada indicador declara su fórmula, periodo y explicación.
 * Si el denominador es cero o faltan datos, el estado es "insufficient_data" o
 * "not_applicable" y `value` es null: nunca se muestra un número engañoso.
 * Ningún indicador "califica" a la persona; solo describen su situación.
 */
import type { Minor } from "@/lib/money/money";

export type IndicatorUnit = "money" | "percent" | "months" | "count";
export type IndicatorStatus = "ok" | "insufficient_data" | "not_applicable";

export interface Indicator {
  key: string;
  label: string;
  value: number | null;
  unit: IndicatorUnit;
  status: IndicatorStatus;
  formula: string;
  period: string;
  explanation: string;
  /** Texto corto cuando no se puede calcular. */
  missing?: string;
}

export interface IndicatorInput {
  periodLabel: string;
  income: Minor;
  expenses: Minor;
  essential: Minor;
  discretionary: Minor;
  unclassified: Minor;
  budgetPlanned: Minor | null;
  budgetExecuted: Minor | null;
  cashBalance: Minor;
  hasAccounts: boolean;
  monthlyDebtPayments: Minor | null;
  totalDebt: Minor;
  monthlyNetIncomeReference: Minor | null;
  emergencyFund: Minor | null;
  essentialMonthlyReference: Minor | null;
  netWorth: Minor | null;
  netWorthPrevMonth: Minor | null;
  netWorthPrevYear: Minor | null;
  goalsAchieved: number;
  goalsActive: number;
}

const ok = (i: Omit<Indicator, "status">): Indicator => ({ ...i, status: i.value === null ? "insufficient_data" : "ok" });

export function computeIndicators(x: IndicatorInput): Indicator[] {
  const p = x.periodLabel;
  const net = x.income - x.expenses;
  return [
    ok({
      key: "income",
      label: "Ingresos netos",
      value: x.income,
      unit: "money",
      formula: "Σ ingresos realizados del periodo (no incluye transferencias entre tus cuentas)",
      period: p,
      explanation: "Dinero que efectivamente recibiste. Los ingresos previstos no se cuentan hasta que llegan.",
    }),
    ok({
      key: "expenses",
      label: "Gastos efectivos",
      value: x.expenses,
      unit: "money",
      formula: "Σ gastos realizados del periodo, incluidos pagos de deudas",
      period: p,
      explanation: "Todo el dinero que salió para consumo u obligaciones. Mover dinero entre tus cuentas no es un gasto.",
    }),
    ok({
      key: "net_flow",
      label: "Flujo neto",
      value: net,
      unit: "money",
      formula: "Ingresos efectivos − gastos efectivos",
      period: p,
      explanation: "Si es positivo, te quedó dinero para ahorrar o invertir; si es negativo, usaste ahorros o crédito.",
    }),
    {
      key: "savings_rate",
      label: "Tasa de ahorro",
      value: x.income > 0 ? net / x.income : null,
      unit: "percent",
      status: x.income > 0 ? "ok" : "insufficient_data",
      formula: "(Ingresos − gastos) ÷ ingresos",
      period: p,
      explanation:
        "Qué parte de lo que recibiste no se gastó. Los abonos a capital de deudas cuentan como gasto aquí, aunque aumentan tu patrimonio.",
      missing: "Registra al menos un ingreso realizado en el periodo.",
    },
    ok({
      key: "essential",
      label: "Gastos esenciales",
      value: x.essential,
      unit: "money",
      formula: "Σ gastos realizados marcados como esenciales (por el gasto o por su categoría)",
      period: p,
      explanation: "Lo que necesitas para vivir y cumplir obligaciones: vivienda, alimentación básica, servicios, salud, transporte, cuotas.",
    }),
    ok({
      key: "discretionary",
      label: "Gastos discrecionales",
      value: x.discretionary,
      unit: "money",
      formula: "Σ gastos realizados marcados como discrecionales",
      period: p,
      explanation:
        x.unclassified > 0
          ? "Gastos que puedes ajustar con más facilidad. Hay gastos sin clasificar que no entran en ninguno de los dos grupos."
          : "Gastos que puedes ajustar con más facilidad si necesitas liberar dinero.",
    }),
    {
      key: "budget_execution",
      label: "Ejecución del presupuesto",
      value: x.budgetPlanned && x.budgetPlanned > 0 ? (x.budgetExecuted ?? 0) / x.budgetPlanned : null,
      unit: "percent",
      status: x.budgetPlanned === null ? "not_applicable" : x.budgetPlanned > 0 ? "ok" : "insufficient_data",
      formula: "Gasto ejecutado ÷ gasto presupuestado del mes",
      period: "Mes en curso",
      explanation: "Cuánto del plan de gastos ya usaste. Compáralo con cuánto del mes ha transcurrido.",
      missing: "Crea el presupuesto del mes para ver este indicador.",
    },
    {
      key: "cash",
      label: "Saldo de caja",
      value: x.hasAccounts ? x.cashBalance : null,
      unit: "money",
      status: x.hasAccounts ? "ok" : "insufficient_data",
      formula: "Σ saldos registrados de cuentas líquidas (efectivo, corriente, ahorros, billeteras)",
      period: "Hoy",
      explanation: "Dinero disponible de inmediato. No incluye inversiones ni bienes.",
      missing: "Crea tus cuentas con su saldo inicial.",
    },
    {
      key: "debt_payments",
      label: "Obligaciones de deuda",
      value: x.monthlyDebtPayments,
      unit: "money",
      status: x.monthlyDebtPayments === null ? "insufficient_data" : "ok",
      formula: "Σ cuotas mínimas mensuales de deudas activas",
      period: "Mensual",
      explanation: "Lo que te comprometiste a pagar cada mes por tus deudas.",
      missing: "Registra tus deudas con su cuota mínima.",
    },
    {
      key: "debt_service_ratio",
      label: "Relación cuotas / ingresos",
      value:
        x.monthlyDebtPayments !== null && x.monthlyNetIncomeReference && x.monthlyNetIncomeReference > 0
          ? x.monthlyDebtPayments / x.monthlyNetIncomeReference
          : null,
      unit: "percent",
      status:
        x.monthlyDebtPayments === null || !x.monthlyNetIncomeReference || x.monthlyNetIncomeReference <= 0
          ? "insufficient_data"
          : "ok",
      formula: "Σ cuotas mínimas mensuales ÷ ingreso neto mensual de referencia (promedio de los últimos 3 meses)",
      period: "Mensual",
      explanation:
        "Qué parte de tu ingreso ya está comprometida con deudas. Muchas entidades miran este dato antes de prestar; cuanto más alto, menos margen tienes.",
      missing: "Necesitas ingresos registrados y deudas con cuota mínima.",
    },
    {
      key: "emergency_coverage",
      label: "Cobertura de emergencia",
      value:
        x.emergencyFund !== null && x.essentialMonthlyReference && x.essentialMonthlyReference > 0
          ? x.emergencyFund / x.essentialMonthlyReference
          : null,
      unit: "months",
      status:
        x.emergencyFund === null
          ? "not_applicable"
          : x.essentialMonthlyReference && x.essentialMonthlyReference > 0
            ? "ok"
            : "insufficient_data",
      formula: "Fondo de emergencia acumulado ÷ gasto esencial mensual",
      period: "Hoy",
      explanation: "Cuántos meses podrías cubrir tus gastos esenciales si dejaras de recibir ingresos.",
      missing: "Crea un objetivo de tipo fondo de emergencia y registra gastos esenciales.",
    },
    {
      key: "net_worth",
      label: "Patrimonio neto",
      value: x.netWorth,
      unit: "money",
      status: x.netWorth === null ? "insufficient_data" : "ok",
      formula: "Activos − pasivos",
      period: "Hoy",
      explanation: "Lo que tendrías si vendieras todo y pagaras todas tus deudas. Incluye bienes que no son dinero disponible.",
      missing: "Registra cuentas, bienes o deudas.",
    },
    {
      key: "net_worth_mom",
      label: "Variación mensual del patrimonio",
      value: x.netWorth !== null && x.netWorthPrevMonth !== null ? x.netWorth - x.netWorthPrevMonth : null,
      unit: "money",
      status: x.netWorth !== null && x.netWorthPrevMonth !== null ? "ok" : "insufficient_data",
      formula: "Patrimonio hoy − patrimonio al cierre del mes anterior",
      period: "Último mes",
      explanation: "Cambia por lo que ahorras, lo que pagas de deudas y la valorización de tus bienes.",
      missing: "Aún no hay datos del mes anterior.",
    },
    {
      key: "net_worth_yoy",
      label: "Variación anual del patrimonio",
      value: x.netWorth !== null && x.netWorthPrevYear !== null ? x.netWorth - x.netWorthPrevYear : null,
      unit: "money",
      status: x.netWorth !== null && x.netWorthPrevYear !== null ? "ok" : "insufficient_data",
      formula: "Patrimonio hoy − patrimonio hace 12 meses",
      period: "Últimos 12 meses",
      explanation: "La tendencia de largo plazo importa más que un mes aislado.",
      missing: "Necesitas al menos 12 meses de historia.",
    },
    {
      key: "goals",
      label: "Objetivos alcanzados",
      value: x.goalsActive + x.goalsAchieved > 0 ? x.goalsAchieved : null,
      unit: "count",
      status: x.goalsActive + x.goalsAchieved > 0 ? "ok" : "not_applicable",
      formula: `Objetivos alcanzados (${x.goalsAchieved}) de ${x.goalsActive + x.goalsAchieved} registrados`,
      period: "Acumulado",
      explanation: "Cada objetivo alcanzado es un hábito que funciona.",
      missing: "Crea tu primer objetivo financiero.",
    },
  ];
}
