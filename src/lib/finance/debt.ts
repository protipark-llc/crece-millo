/**
 * Deudas: conversión de tasas, cuotas, amortización y estrategias de pago.
 *
 * Tasas (convenciones usadas en Colombia y la región):
 * - EA   (efectiva anual):               i_m = (1 + r)^(1/12) − 1
 * - NAMV (nominal anual mes vencido):    i_m = r / 12
 * - EM   (efectiva mensual / "mes vencido" sobre saldo): i_m = r
 * Toda comparación entre deudas se hace en tasa efectiva anual: EA = (1 + i_m)^12 − 1.
 *
 * Amortización mensual (sistema de saldos): interés_t = redondeo(saldo_{t-1} × i_m);
 * cargos_t fijos; abono a capital = pago − interés − cargos. Si el pago no cubre
 * interés + cargos la deuda nunca se extingue y se reporta como tal.
 * Los resultados son estimaciones educativas: los contratos reales pueden capitalizar
 * diario, cobrar seguros variables o cambiar de tasa.
 */
import { roundMinor, type Minor } from "@/lib/money/money";

export type RateBasis = "EA" | "NAMV" | "EM";

export const RATE_BASIS_LABELS: Record<RateBasis, string> = {
  EA: "Efectiva anual (E.A.)",
  NAMV: "Nominal anual mes vencido (N.A.M.V.)",
  EM: "Efectiva mensual (M.V.)",
};

export function monthlyRate(ratePercent: number, basis: RateBasis): number {
  const r = ratePercent / 100;
  if (r < 0) throw new Error("La tasa no puede ser negativa");
  switch (basis) {
    case "EA":
      return Math.pow(1 + r, 1 / 12) - 1;
    case "NAMV":
      return r / 12;
    case "EM":
      return r;
  }
}

export function effectiveAnnualFromMonthly(m: number): number {
  return Math.pow(1 + m, 12) - 1;
}

export function effectiveAnnual(ratePercent: number, basis: RateBasis): number {
  return effectiveAnnualFromMonthly(monthlyRate(ratePercent, basis));
}

/** Cuota fija (sistema francés) para `n` meses. Con tasa 0, capital / n. */
export function fixedInstallment(principal: Minor, monthly: number, n: number): Minor {
  if (n <= 0) throw new Error("El plazo debe ser mayor que cero");
  if (monthly === 0) return Math.ceil(principal / n);
  return roundMinor((principal * monthly) / (1 - Math.pow(1 + monthly, -n)));
}

export interface AmortizationRow {
  month: number;
  opening: Minor;
  interest: Minor;
  fees: Minor;
  payment: Minor;
  principal: Minor;
  closing: Minor;
}

export interface AmortizationResult {
  status: "paid_off" | "never" | "max_months";
  months: number;
  totalInterest: Minor;
  totalFees: Minor;
  totalPaid: Minor;
  schedule: AmortizationRow[];
}

export function amortize(
  balance: Minor,
  monthly: number,
  payment: Minor,
  monthlyFees: Minor = 0,
  maxMonths = 600,
): AmortizationResult {
  const schedule: AmortizationRow[] = [];
  let b = balance;
  let totalInterest = 0;
  let totalFees = 0;
  let totalPaid = 0;
  if (b <= 0) return { status: "paid_off", months: 0, totalInterest, totalFees, totalPaid, schedule };
  const firstInterest = roundMinor(b * monthly);
  if (payment <= firstInterest + monthlyFees) {
    return { status: "never", months: 0, totalInterest, totalFees, totalPaid, schedule };
  }
  for (let month = 1; month <= maxMonths; month++) {
    const interest = roundMinor(b * monthly);
    const due = b + interest + monthlyFees;
    const pay = Math.min(payment, due);
    const principal = pay - interest - monthlyFees;
    const closing = b - principal;
    schedule.push({ month, opening: b, interest, fees: monthlyFees, payment: pay, principal, closing });
    totalInterest += interest;
    totalFees += monthlyFees;
    totalPaid += pay;
    b = closing;
    if (b <= 0) return { status: "paid_off", months: month, totalInterest, totalFees, totalPaid, schedule };
  }
  return { status: "max_months", months: maxMonths, totalInterest, totalFees, totalPaid, schedule };
}

export interface DebtForPlan {
  id: string;
  name: string;
  balance: Minor;
  /** Tasa mensual efectiva; null si es desconocida (se simula como 0 % y se advierte). */
  monthlyRate: number | null;
  minimumPayment: Minor | null;
  monthlyFees: Minor;
  /** Para estrategia personalizada: menor número = mayor prioridad. */
  customPriority?: number | null;
}

export type Strategy = "minimum" | "avalanche" | "snowball" | "custom";

export const STRATEGY_LABELS: Record<Strategy, string> = {
  minimum: "Solo pagos mínimos",
  avalanche: "Avalancha (mayor tasa primero)",
  snowball: "Bola de nieve (menor saldo primero)",
  custom: "Personalizado (tu orden)",
};

export interface PlanResult {
  strategy: Strategy;
  feasible: boolean;
  months: number | null;
  totalInterest: Minor;
  totalFees: Minor;
  totalPaid: Minor;
  monthlyBudget: Minor;
  payoffOrder: { id: string; name: string; month: number | null }[];
  balanceSeries: Minor[];
  /** Total pagado en cada mes (índice 0 = mes 1). */
  paymentSeries: Minor[];
  warnings: string[];
}

export function orderDebts(debts: DebtForPlan[], strategy: Strategy): DebtForPlan[] {
  const list = [...debts];
  if (strategy === "avalanche") {
    // Mayor tasa efectiva primero; tasas desconocidas al final; empate → menor saldo.
    list.sort((a, b) => (b.monthlyRate ?? -1) - (a.monthlyRate ?? -1) || a.balance - b.balance);
  } else if (strategy === "snowball") {
    list.sort((a, b) => a.balance - b.balance || (b.monthlyRate ?? 0) - (a.monthlyRate ?? 0));
  } else if (strategy === "custom") {
    list.sort((a, b) => (a.customPriority ?? 999) - (b.customPriority ?? 999));
  }
  return list;
}

/**
 * Simula el pago conjunto de varias deudas mes a mes.
 * Presupuesto mensual = Σ pagos mínimos + pago extra. Cuando una deuda se extingue,
 * su cuota mínima se suma al pago extra (efecto "bola de nieve"), salvo en la
 * estrategia "minimum", que solo paga mínimos.
 */
export function simulatePayoff(debts: DebtForPlan[], strategy: Strategy, extraMonthly: Minor = 0, maxMonths = 600): PlanResult {
  const warnings: string[] = [];
  const usable = debts.filter((d) => d.balance > 0);
  const missingMin = usable.filter((d) => d.minimumPayment === null || d.minimumPayment <= 0);
  for (const d of missingMin) {
    warnings.push(`"${d.name}" no tiene cuota mínima registrada; se excluye de la simulación.`);
  }
  const active = orderDebts(
    usable.filter((d) => d.minimumPayment !== null && d.minimumPayment > 0),
    strategy,
  );
  for (const d of active) {
    if (d.monthlyRate === null) warnings.push(`"${d.name}" no tiene tasa registrada; se simula con 0 % y el resultado subestima los intereses.`);
  }
  const balances = new Map(active.map((d) => [d.id, d.balance]));
  const payoffMonth = new Map<string, number>();
  const monthlyBudget = active.reduce((s, d) => s + (d.minimumPayment ?? 0), 0) + (strategy === "minimum" ? 0 : extraMonthly);
  let totalInterest = 0;
  let totalFees = 0;
  let totalPaid = 0;
  const balanceSeries: Minor[] = [active.reduce((s, d) => s + d.balance, 0)];
  const paymentSeries: Minor[] = [];
  let month = 0;
  let feasible = true;

  while ([...balances.values()].some((b) => b > 0)) {
    month++;
    if (month > maxMonths) {
      feasible = false;
      warnings.push(`Con estos pagos las deudas no se terminan de pagar en ${maxMonths / 12} años.`);
      break;
    }
    let available = monthlyBudget;
    const paidBefore = totalPaid;
    // 1) Intereses y cargos del mes.
    const dueNow = new Map<string, Minor>();
    for (const d of active) {
      const b = balances.get(d.id)!;
      if (b <= 0) continue;
      const interest = roundMinor(b * (d.monthlyRate ?? 0));
      totalInterest += interest;
      totalFees += d.monthlyFees;
      dueNow.set(d.id, b + interest + d.monthlyFees);
    }
    // 2) Pagos mínimos (o lo que falte para cancelar).
    for (const d of active) {
      const due = dueNow.get(d.id);
      if (due === undefined) continue;
      const pay = Math.min(d.minimumPayment ?? 0, due, available);
      available -= pay;
      totalPaid += pay;
      dueNow.set(d.id, due - pay);
    }
    // 3) Excedente a la deuda prioritaria (no aplica en "minimum": el excedente no existe).
    if (strategy !== "minimum") {
      for (const d of active) {
        if (available <= 0) break;
        const due = dueNow.get(d.id);
        if (due === undefined || due <= 0) continue;
        const pay = Math.min(due, available);
        available -= pay;
        totalPaid += pay;
        dueNow.set(d.id, due - pay);
      }
    }
    for (const [id, remaining] of dueNow) {
      balances.set(id, remaining);
      if (remaining <= 0 && !payoffMonth.has(id)) payoffMonth.set(id, month);
    }
    balanceSeries.push([...balances.values()].reduce((s, b) => s + Math.max(0, b), 0));
    paymentSeries.push(totalPaid - paidBefore);
    // Deuda que crece mes a mes (cuota < intereses) → no factible.
    if (month === 12 && balanceSeries[12]! >= balanceSeries[0]!) {
      feasible = false;
      warnings.push("Los pagos no alcanzan a cubrir los intereses: la deuda total no disminuye.");
      break;
    }
  }
  return {
    strategy,
    feasible,
    months: feasible ? month : null,
    totalInterest,
    totalFees,
    totalPaid,
    monthlyBudget,
    payoffOrder: active.map((d) => ({ id: d.id, name: d.name, month: payoffMonth.get(d.id) ?? null })),
    balanceSeries,
    paymentSeries,
    warnings,
  };
}

/** Estima la división de un pago entre intereses y capital (un mes de intereses). */
export function splitPayment(
  amount: Minor,
  balance: Minor,
  monthly: number | null,
  fees: Minor = 0,
): { interest: Minor; fees: Minor; principal: Minor; estimated: boolean } {
  const interest = Math.min(amount, roundMinor(balance * (monthly ?? 0)));
  const f = Math.min(amount - interest, fees);
  return { interest, fees: f, principal: Math.min(balance, amount - interest - f), estimated: true };
}
