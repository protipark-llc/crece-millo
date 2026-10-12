/**
 * Objetivos de ahorro y fondo de emergencia.
 *
 * - Faltante              = máx(0, meta − acumulado).
 * - Aporte mensual (sin rendimiento) = techo(faltante / meses restantes).
 * - Con rendimiento mensual i > 0 (supuesto explícito, nunca garantizado):
 *     aporte = (faltante − acumulado·((1+i)^n − 1)) · i / ((1+i)^n − 1)
 *   es decir, se descuenta lo que crecería el acumulado y se resuelve la anualidad.
 * - Cobertura del fondo de emergencia (meses) = fondo / gasto esencial mensual.
 * - Disponible sin comprometer = caja líquida − Σ acumulado en objetivos activos.
 */
import { roundMinor, type Minor } from "@/lib/money/money";
import { monthsBetweenCeil, type ISODate } from "./dates";

export function requiredMonthlyContribution(
  target: Minor,
  accumulated: Minor,
  months: number,
  monthlyReturn = 0,
): Minor | null {
  const missing = target - accumulated;
  if (missing <= 0) return 0;
  if (months <= 0) return null;
  if (monthlyReturn <= 0) return Math.ceil(missing / months);
  const growth = Math.pow(1 + monthlyReturn, months);
  const futureOfAccumulated = accumulated * growth;
  const stillMissing = target - futureOfAccumulated;
  if (stillMissing <= 0) return 0;
  return Math.max(0, roundMinor((stillMissing * monthlyReturn) / (growth - 1)));
}

export interface GoalProgress {
  missing: Minor;
  progressPct: number | null;
  monthsLeft: number | null;
  requiredMonthly: Minor | null;
  onTrack: boolean | null;
  /** Meses estimados al ritmo del aporte planificado (sin rendimiento). */
  monthsAtPlannedPace: number | null;
}

export function goalProgress(input: {
  target: Minor;
  accumulated: Minor;
  targetDate: ISODate | null;
  today: ISODate;
  plannedMonthly: Minor | null;
}): GoalProgress {
  const missing = Math.max(0, input.target - input.accumulated);
  const monthsLeft = input.targetDate ? monthsBetweenCeil(input.today, input.targetDate) : null;
  const requiredMonthly =
    monthsLeft === null ? null : monthsLeft === 0 ? (missing > 0 ? null : 0) : requiredMonthlyContribution(input.target, input.accumulated, monthsLeft);
  const monthsAtPlannedPace =
    missing === 0 ? 0 : input.plannedMonthly && input.plannedMonthly > 0 ? Math.ceil(missing / input.plannedMonthly) : null;
  let onTrack: boolean | null = null;
  if (missing === 0) onTrack = true;
  else if (requiredMonthly !== null && input.plannedMonthly !== null) onTrack = input.plannedMonthly >= requiredMonthly;
  else if (monthsLeft === 0) onTrack = false;
  return {
    missing,
    progressPct: input.target > 0 ? Math.min(1, input.accumulated / input.target) : null,
    monthsLeft,
    requiredMonthly,
    onTrack,
    monthsAtPlannedPace,
  };
}

/** Escenarios de aporte si cambia el plazo o el importe de la meta. */
export function goalScenarios(target: Minor, accumulated: Minor, monthsLeft: number) {
  const variants = [
    { label: "Plazo actual", months: monthsLeft, target },
    { label: "6 meses más de plazo", months: monthsLeft + 6, target },
    { label: "12 meses más de plazo", months: monthsLeft + 12, target },
    { label: "Meta 20 % menor", months: monthsLeft, target: roundMinor(target * 0.8) },
  ];
  if (monthsLeft > 6) variants.splice(1, 0, { label: "6 meses menos de plazo", months: monthsLeft - 6, target });
  return variants.map((v) => ({ ...v, monthly: requiredMonthlyContribution(v.target, accumulated, v.months) }));
}

export type IncomeStability = "stable" | "variable" | "mixed";

/**
 * Sugerencia de meses de cobertura. No es una cifra universal: se explica el criterio
 * y la persona puede cambiarla. Base 3 meses; +3 si los ingresos son variables;
 * +1 si son mixtos; +1 si hay personas a cargo; +1 si hay un solo ingreso en el hogar. Máximo 12.
 */
export function suggestedEmergencyMonths(input: {
  stability: IncomeStability | null;
  dependents: number;
  singleIncome: boolean;
}): { months: number; reasons: string[] } {
  let months = 3;
  const reasons = ["Punto de partida habitual: 3 meses de gastos esenciales."];
  if (input.stability === "variable") {
    months += 3;
    reasons.push("Tus ingresos son variables: conviene un colchón más amplio (+3).");
  } else if (input.stability === "mixed") {
    months += 1;
    reasons.push("Parte de tus ingresos es variable (+1).");
  } else if (input.stability === null) {
    reasons.push("No indicaste la estabilidad de tus ingresos; complétala en el diagnóstico para afinar.");
  }
  if (input.dependents > 0) {
    months += 1;
    reasons.push(`Tienes ${input.dependents} persona(s) que dependen de ti (+1).`);
  }
  if (input.singleIncome) {
    months += 1;
    reasons.push("El hogar depende de un solo ingreso (+1).");
  }
  return { months: Math.min(12, months), reasons };
}

export function coverageMonths(fund: Minor, essentialMonthly: Minor): number | null {
  if (essentialMonthly <= 0) return null;
  return fund / essentialMonthly;
}
