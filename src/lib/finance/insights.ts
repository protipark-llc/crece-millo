/**
 * Recomendaciones deterministas basadas en reglas transparentes.
 * No es un modelo de IA: cada recomendación dice qué observó, con qué datos,
 * por qué importa, qué acción se sugiere, el impacto si se puede estimar y qué
 * incertidumbre o información falta. No da recomendaciones de inversión.
 */
import type { Minor } from "@/lib/money/money";
import type { ISODate } from "./dates";

export type InsightSeverity = "info" | "attention" | "critical";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  observation: string;
  data: { label: string; value: string }[];
  explanation: string;
  action: { label: string; href: string };
  impact: string | null;
  uncertainty: string;
}

export interface InsightInput {
  fmt: (m: Minor) => string;
  fmtPct: (v: number | null) => string;
  fmtDate: (d: ISODate) => string;
  hasAccounts: boolean;
  hasIncome: boolean;
  hasBudget: boolean;
  firstNegativeDate: ISODate | null;
  lowestBalance: Minor;
  daysAhead: number;
  overdueCount: number;
  overLimitLines: { name: string; planned: Minor; executed: Minor }[];
  lastMonth: { income: Minor; expenses: Minor } | null;
  emergency: { fund: Minor; essentialMonthly: Minor | null; targetMonths: number } | null;
  debts: { name: string; ea: number | null; balance: Minor; daysPastDue: number; minimumPayment: Minor | null }[];
  avalancheSavings: { interestSaved: Minor; monthsSaved: number | null; extra: Minor } | null;
  debtServiceRatio: number | null;
  subscriptionsMonthly: Minor;
  monthlyIncomeReference: Minor | null;
  uncategorizedCount: number;
}

const HIGH_EA = 0.25;

export function buildInsights(x: InsightInput): Insight[] {
  const out: Insight[] = [];
  if (!x.hasAccounts) {
    out.push({
      id: "setup_accounts",
      severity: "info",
      title: "Empieza registrando tus cuentas",
      observation: "Aún no tienes cuentas registradas.",
      data: [],
      explanation: "Los saldos, el flujo de caja y el patrimonio parten del dinero que tienes hoy en cada cuenta.",
      action: { label: "Crear cuenta", href: "/universidad/finanzas/cuentas" },
      impact: null,
      uncertainty: "Sin cuentas no es posible calcular caja ni proyecciones.",
    });
  }
  if (x.hasAccounts && !x.hasIncome) {
    out.push({
      id: "setup_income",
      severity: "info",
      title: "Registra tus ingresos",
      observation: "No hay ingresos registrados ni programados.",
      data: [],
      explanation: "La tasa de ahorro, la relación cuota/ingreso y las proyecciones dependen de conocer tus ingresos.",
      action: { label: "Registrar ingreso", href: "/universidad/finanzas/ingresos" },
      impact: null,
      uncertainty: "Los indicadores que dependen del ingreso aparecen como 'datos insuficientes'.",
    });
  }
  if (x.firstNegativeDate) {
    out.push({
      id: "negative_cash",
      severity: "critical",
      title: "Tu caja podría quedar en negativo",
      observation: `Según tus movimientos previstos, el saldo de tus cuentas líquidas baja de cero el ${x.fmtDate(x.firstNegativeDate)}.`,
      data: [
        { label: "Saldo más bajo previsto", value: x.fmt(x.lowestBalance) },
        { label: "Horizonte analizado", value: `${x.daysAhead} días` },
      ],
      explanation: "Un saldo negativo suele significar sobregiros, pagos atrasados o uso de tarjeta de crédito para cubrir gastos.",
      action: { label: "Revisar flujo de caja", href: "/universidad/finanzas/flujo-de-caja" },
      impact: `Necesitarías al menos ${x.fmt(-x.lowestBalance)} adicionales o mover pagos para evitarlo.`,
      uncertainty: "Depende de que los ingresos previstos lleguen en la fecha registrada.",
    });
  }
  if (x.overdueCount > 0) {
    out.push({
      id: "overdue",
      severity: "attention",
      title: "Movimientos previstos vencidos",
      observation: `${x.overdueCount} movimiento(s) previsto(s) pasaron su fecha y no están marcados como realizados ni anulados.`,
      data: [],
      explanation: "Mientras no los actualices, el sistema asume que ocurrirán hoy, lo que puede distorsionar tu proyección.",
      action: { label: "Revisar movimientos", href: "/universidad/finanzas/movimientos?estado=planned" },
      impact: null,
      uncertainty: "No sabemos si ya los pagaste o recibiste por fuera del registro.",
    });
  }
  for (const line of x.overLimitLines.slice(0, 3)) {
    out.push({
      id: `over_${line.name}`,
      severity: "attention",
      title: `Superaste el presupuesto de ${line.name}`,
      observation: `Has gastado ${x.fmt(line.executed)} frente a ${x.fmt(line.planned)} presupuestados.`,
      data: [
        { label: "Presupuestado", value: x.fmt(line.planned) },
        { label: "Ejecutado", value: x.fmt(line.executed) },
      ],
      explanation: "Exceder una categoría no es un fracaso: es información. Puedes reasignar desde otra categoría o ajustar el plan del próximo mes.",
      action: { label: "Reasignar presupuesto", href: "/universidad/finanzas/presupuesto" },
      impact: `Exceso: ${x.fmt(line.executed - line.planned)}.`,
      uncertainty: "Revisa que los gastos estén bien categorizados.",
    });
  }
  if (x.lastMonth && x.lastMonth.income > 0 && x.lastMonth.expenses > x.lastMonth.income) {
    out.push({
      id: "deficit_last_month",
      severity: "attention",
      title: "El mes pasado gastaste más de lo que ingresó",
      observation: `Déficit de ${x.fmt(x.lastMonth.expenses - x.lastMonth.income)}.`,
      data: [
        { label: "Ingresos", value: x.fmt(x.lastMonth.income) },
        { label: "Gastos", value: x.fmt(x.lastMonth.expenses) },
      ],
      explanation: "Un déficit puntual (por ejemplo un gasto anual) es normal; uno repetido reduce ahorros o aumenta deudas.",
      action: { label: "Ver informes", href: "/universidad/finanzas/informes" },
      impact: null,
      uncertainty: "Si hubo ingresos no registrados, el déficit real es menor.",
    });
  }
  if (x.emergency && x.emergency.essentialMonthly && x.emergency.essentialMonthly > 0) {
    const coverage = x.emergency.fund / x.emergency.essentialMonthly;
    if (coverage < x.emergency.targetMonths) {
      const gap = Math.ceil(x.emergency.targetMonths * x.emergency.essentialMonthly - x.emergency.fund);
      out.push({
        id: "emergency_gap",
        severity: coverage < 1 ? "attention" : "info",
        title: "Fortalece tu fondo de emergencia",
        observation: `Tu fondo cubre ${coverage.toFixed(1).replace(".", ",")} meses de gastos esenciales; tu meta es ${x.emergency.targetMonths}.`,
        data: [
          { label: "Fondo actual", value: x.fmt(x.emergency.fund) },
          { label: "Gasto esencial mensual", value: x.fmt(x.emergency.essentialMonthly) },
        ],
        explanation: "Un fondo de emergencia evita que un imprevisto se convierta en deuda cara.",
        action: { label: "Ver objetivos", href: "/universidad/finanzas/objetivos" },
        impact: `Te faltan ${x.fmt(gap)} para la meta.`,
        uncertainty: "El gasto esencial se calcula con lo que registraste; si falta información, la cobertura real es distinta.",
      });
    }
  }
  const arrears = x.debts.filter((d) => d.daysPastDue > 0);
  for (const d of arrears) {
    out.push({
      id: `arrears_${d.name}`,
      severity: "critical",
      title: `"${d.name}" está en mora`,
      observation: `${d.daysPastDue} días de atraso.`,
      data: [{ label: "Saldo", value: x.fmt(d.balance) }],
      explanation:
        "La mora genera intereses de mora y puede reportarse a centrales de riesgo, lo que afecta el acceso a crédito. Ponerse al día suele ser prioritario.",
      action: { label: "Ver deuda", href: "/universidad/finanzas/deudas" },
      impact: null,
      uncertainty: "Consulta con la entidad el valor exacto para normalizar y si ofrecen acuerdos de pago.",
    });
  }
  const expensive = x.debts.filter((d) => d.ea !== null && d.ea >= HIGH_EA && d.balance > 0);
  if (expensive.length > 0) {
    out.push({
      id: "expensive_debt",
      severity: "attention",
      title: "Tienes deuda con tasa alta",
      observation: `${expensive.length} deuda(s) con tasa efectiva anual ≥ ${x.fmtPct(HIGH_EA)}.`,
      data: expensive.map((d) => ({ label: d.name, value: `${x.fmtPct(d.ea)} E.A.` })),
      explanation: "Cada peso que abonas a la deuda más cara es un 'rendimiento' garantizado igual a su tasa.",
      action: { label: "Comparar estrategias", href: "/universidad/finanzas/deudas" },
      impact: x.avalancheSavings
        ? `Abonando ${x.fmt(x.avalancheSavings.extra)} extra al mes con el método avalancha ahorrarías aprox. ${x.fmt(x.avalancheSavings.interestSaved)} en intereses${x.avalancheSavings.monthsSaved ? ` y terminarías ${x.avalancheSavings.monthsSaved} meses antes` : ""}.`
        : null,
      uncertainty: "Estimación con tasa constante; los contratos pueden tener cargos o cambios de tasa no registrados.",
    });
  }
  if (x.debtServiceRatio !== null && x.debtServiceRatio > 0.3) {
    out.push({
      id: "debt_service",
      severity: x.debtServiceRatio > 0.4 ? "critical" : "attention",
      title: "Una parte alta de tu ingreso va a deudas",
      observation: `Tus cuotas mínimas equivalen al ${x.fmtPct(x.debtServiceRatio)} de tu ingreso mensual de referencia.`,
      data: [],
      explanation:
        "Por encima de ~30–40 % queda poco margen para imprevistos. Antes de asumir nuevas cuotas, conviene reducir este porcentaje.",
      action: { label: "Simular una nueva cuota", href: "/universidad/finanzas/simulador" },
      impact: null,
      uncertainty: "Usa el promedio de ingresos de los últimos 3 meses; si tus ingresos cambiaron, revisa el dato.",
    });
  }
  if (x.monthlyIncomeReference && x.monthlyIncomeReference > 0 && x.subscriptionsMonthly / x.monthlyIncomeReference > 0.05) {
    out.push({
      id: "subscriptions",
      severity: "info",
      title: "Revisa tus suscripciones",
      observation: `Tus suscripciones suman ${x.fmt(x.subscriptionsMonthly)} al mes (${x.fmtPct(x.subscriptionsMonthly / x.monthlyIncomeReference)} de tu ingreso).`,
      data: [],
      explanation: "Los cobros pequeños y automáticos se olvidan con facilidad. Cancelar los que no usas libera dinero sin esfuerzo.",
      action: { label: "Ver gastos", href: "/universidad/finanzas/gastos" },
      impact: null,
      uncertainty: "Se consideran los gastos de la categoría Suscripciones.",
    });
  }
  if (x.uncategorizedCount > 0) {
    out.push({
      id: "uncategorized",
      severity: "info",
      title: "Gastos sin categoría",
      observation: `${x.uncategorizedCount} gasto(s) no tienen categoría.`,
      data: [],
      explanation: "Sin categoría no se pueden comparar con el presupuesto ni clasificar como esenciales o discrecionales.",
      action: { label: "Categorizar", href: "/universidad/finanzas/gastos" },
      impact: null,
      uncertainty: "",
    });
  }
  if (x.hasAccounts && !x.hasBudget) {
    out.push({
      id: "setup_budget",
      severity: "info",
      title: "Crea el presupuesto de este mes",
      observation: "No hay presupuesto para el mes en curso.",
      data: [],
      explanation: "Un presupuesto es un plan: decide antes de gastar a dónde va cada peso.",
      action: { label: "Crear presupuesto", href: "/universidad/finanzas/presupuesto" },
      impact: null,
      uncertainty: "",
    });
  }
  const order: Record<InsightSeverity, number> = { critical: 0, attention: 1, info: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
