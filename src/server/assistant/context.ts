/**
 * Preparación para un futuro asistente financiero con IA.
 *
 * Hoy NO hay integración con ningún modelo: las recomendaciones de la aplicación salen del
 * motor determinista (src/lib/finance/insights.ts). Este módulo define el contrato para
 * conectarlo después sin tocar el resto del sistema:
 *
 * 1. `buildAssistantContext` resume los datos de la persona en cifras AGREGADAS (sin
 *    descripciones libres, nombres de contrapartes ni identificadores), aplicando
 *    minimización de datos antes de enviar nada a un proveedor externo.
 * 2. `AssistantProvider` es la interfaz que implementaría un proveedor real. La respuesta
 *    debe citar los datos usados y nunca ejecutar cambios: el asistente sugiere; la persona decide.
 * 3. Las respuestas deberían pasar por las mismas reglas de las recomendaciones: sin asesoría
 *    de inversión personalizada y explicitando la incertidumbre.
 */
import { monthStart } from "@/lib/finance/dates";
import type { Insight } from "@/lib/finance/insights";
import { debtSummaries, goalsSummary, liquidBalance, monthlyReferences, netWorthNow, periodBreakdown, type FinanceData } from "../services/finance-data";

export interface AssistantContext {
  currency: string;
  today: string;
  cash: number;
  monthToDate: { income: number; expenses: number; essential: number; discretionary: number };
  monthlyReference: { income: number | null; essential: number | null; discretionary: number | null; source: string };
  debts: { type: string; balance: number; effectiveAnnualRate: number | null; minimumPayment: number | null; daysPastDue: number }[];
  goals: { type: string; target: number; accumulated: number; targetDate: string | null }[];
  netWorth: { assets: number; liabilities: number; liquid: number };
  /** Recomendaciones deterministas ya calculadas: el asistente las explica, no las reemplaza. */
  insights: Pick<Insight, "id" | "severity" | "title" | "observation">[];
}

export function buildAssistantContext(d: FinanceData, insights: Insight[]): AssistantContext {
  const m = periodBreakdown(d, monthStart(d.today), d.today);
  const refs = monthlyReferences(d);
  const nw = netWorthNow(d);
  return {
    currency: d.base,
    today: d.today,
    cash: liquidBalance(d),
    monthToDate: { income: m.income, expenses: m.expense, essential: m.essential, discretionary: m.discretionary },
    monthlyReference: { income: refs.income, essential: refs.essential, discretionary: refs.discretionary, source: refs.source },
    debts: debtSummaries(d)
      .filter((x) => x.debt.status === "active")
      .map((x) => ({ type: x.debt.type, balance: x.balance, effectiveAnnualRate: x.ea, minimumPayment: x.debt.minimumPayment, daysPastDue: x.debt.daysPastDue })),
    goals: goalsSummary(d).active.map((g) => ({ type: g.goal.type, target: g.goal.targetAmount, accumulated: g.accumulated, targetDate: g.goal.targetDate })),
    netWorth: { assets: nw.assets, liabilities: nw.liabilities, liquid: nw.liquid },
    insights: insights.map((i) => ({ id: i.id, severity: i.severity, title: i.title, observation: i.observation })),
  };
}

export interface AssistantAnswer {
  text: string;
  /** Claves del contexto en las que se basa la respuesta (trazabilidad). */
  dataUsed: string[];
  uncertainty: string;
}

/** Contrato para un proveedor de IA futuro. No hay implementación en esta versión. */
export interface AssistantProvider {
  answer(question: string, context: AssistantContext): Promise<AssistantAnswer>;
}
