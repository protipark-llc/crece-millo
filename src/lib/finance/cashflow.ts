/**
 * Saldos y flujo de caja.
 *
 * Definiciones (docs/FORMULAS.md):
 * - Efecto de un movimiento sobre una cuenta: ingreso +importe; gasto −importe;
 *   transferencia −importe en origen y +importe recibido en destino.
 * - Saldo registrado(fecha)  = saldo inicial + efectos de movimientos REALIZADOS con fecha efectiva ≤ fecha.
 * - Saldo conciliado(fecha)  = igual, pero solo con movimientos marcados como conciliados.
 * - Saldo proyectado(fecha)  = saldo registrado(hoy) + movimientos PREVISTOS (guardados o
 *   generados por recurrencias) hasta la fecha. Los previstos vencidos y no pagados (y las
 *   ocurrencias recurrentes de los últimos 31 días sin confirmar) se asumen en la fecha de
 *   hoy y se marcan como "vencidos".
 * - Flujo neto del periodo   = ingresos − gastos (las transferencias entre cuentas propias no cuentan).
 * - Saldo final              = saldo inicial + ingresos − gastos + transferencias netas que
 *   entran/salen del conjunto de cuentas analizado (p. ej. caja → inversión) + saldos
 *   iniciales de cuentas abiertas dentro del periodo − salidas estimadas.
 * - Salidas estimadas (opcionales, solo días futuros): gasto variable promedio repartido por
 *   día y cuotas mínimas de deudas en su día de pago. Se reportan aparte de lo programado.
 */
import { add, sum, type Minor } from "@/lib/money/money";
import { addDays, daysInMonth, monthEnd, monthStart, parts, weekStart, type ISODate } from "./dates";
import { convert } from "./fx";
import { virtualOccurrences } from "./recurrence";
import { effectiveDate, type EngineAccount, type EngineRule, type EngineTx, type ExchangeRate } from "./types";

/** Efecto firmado de un movimiento sobre una cuenta concreta (en la moneda de esa cuenta). */
export function effectOn(tx: EngineTx, accountId: string): Minor {
  if (tx.status === "cancelled") return 0;
  if (tx.kind === "income") return tx.accountId === accountId ? tx.amount : 0;
  if (tx.kind === "expense") return tx.accountId === accountId ? -tx.amount : 0;
  let effect = 0;
  if (tx.accountId === accountId) effect -= tx.amount;
  if (tx.toAccountId === accountId) effect += tx.toAmount ?? tx.amount;
  return effect;
}

export type BalanceMode = "registered" | "reconciled";

export function accountBalance(account: EngineAccount, txs: EngineTx[], asOf: ISODate, mode: BalanceMode = "registered"): Minor {
  if (asOf < account.openedOn) return 0;
  let balance = account.openingBalance;
  for (const tx of txs) {
    if (tx.status !== "posted") continue;
    if (mode === "reconciled" && !tx.reconciled) continue;
    if (effectiveDate(tx) > asOf) continue;
    const e = effectOn(tx, account.id);
    if (e !== 0) balance = add(balance, e);
  }
  return balance;
}

export interface AccountBalances {
  accountId: string;
  registered: Minor;
  reconciled: Minor;
  projected: Minor;
  pendingIn: Minor;
  pendingOut: Minor;
}

/** Saldos registrado, conciliado y proyectado (a `projectTo`) de cada cuenta. */
export function accountBalances(
  accounts: EngineAccount[],
  txs: EngineTx[],
  rules: EngineRule[],
  today: ISODate,
  projectTo: ISODate,
): AccountBalances[] {
  const planned = [
    ...txs.filter((t) => t.status === "planned" && t.date <= projectTo),
    ...virtualOccurrences(rules, txs, today, projectTo),
  ];
  return accounts.map((a) => {
    const registered = accountBalance(a, txs, today, "registered");
    const reconciled = accountBalance(a, txs, today, "reconciled");
    let pendingIn = 0;
    let pendingOut = 0;
    for (const t of planned) {
      const e = effectOn(t, a.id);
      if (e > 0) pendingIn = add(pendingIn, e);
      else if (e < 0) pendingOut = add(pendingOut, -e);
    }
    return { accountId: a.id, registered, reconciled, projected: registered + pendingIn - pendingOut, pendingIn, pendingOut };
  });
}

export interface PeriodTotals {
  income: Minor;
  expense: Minor;
  net: Minor;
  /** Importes excluidos por no tener tasa de cambio. */
  unconvertedCount: number;
}

/**
 * Ingresos y gastos REALIZADOS en [from, to] consolidados en `baseCurrency`.
 * Las transferencias nunca cuentan como ingreso ni gasto.
 */
export function postedTotals(
  txs: EngineTx[],
  from: ISODate,
  to: ISODate,
  baseCurrency: string,
  rates: ExchangeRate[] = [],
  filter?: (tx: EngineTx) => boolean,
): PeriodTotals {
  let income = 0;
  let expense = 0;
  let unconvertedCount = 0;
  for (const tx of txs) {
    if (tx.status !== "posted" || tx.kind === "transfer") continue;
    const d = effectiveDate(tx);
    if (d < from || d > to) continue;
    if (filter && !filter(tx)) continue;
    const amount = convert(tx.amount, tx.currency, baseCurrency, rates, d);
    if (amount === null) {
      unconvertedCount++;
      continue;
    }
    if (tx.kind === "income") income = add(income, amount);
    else expense = add(expense, amount);
  }
  return { income, expense, net: income - expense, unconvertedCount };
}

export type Granularity = "day" | "week" | "month";

/** Ventana en la que una ocurrencia recurrente sin confirmar se considera vencida (y se asume hoy). */
export const OVERDUE_LOOKBACK_DAYS = 31;

export interface CashflowBucket {
  key: string;
  start: ISODate;
  end: ISODate;
  /** "actual" = ya ocurrió; "mixed" = contiene hoy; "projected" = futuro. */
  phase: "actual" | "mixed" | "projected";
  opening: Minor;
  realIncome: Minor;
  realExpense: Minor;
  projectedIncome: Minor;
  projectedExpense: Minor;
  /** Transferencias que entran (+) o salen (−) del conjunto de cuentas analizado. */
  transfersNet: Minor;
  /** Saldos iniciales de cuentas abiertas dentro del periodo (no son ingresos). */
  accountOpenings: Minor;
  /** Salidas ESTIMADAS (no programadas): gasto variable promedio y cuotas de deudas. */
  estimatedExpense: Minor;
  closing: Minor;
  minBalance: Minor;
  minBalanceDate: ISODate;
  overdueCount: number;
}

export interface CashflowOptions {
  accounts: EngineAccount[];
  txs: EngineTx[];
  rules: EngineRule[];
  from: ISODate;
  to: ISODate;
  today: ISODate;
  granularity: Granularity;
  baseCurrency: string;
  rates?: ExchangeRate[];
  /** Por defecto: cuentas líquidas no archivadas. */
  accountFilter?: (a: EngineAccount) => boolean;
  /** Ajuste de escenario sobre los flujos PROYECTADOS (nunca sobre los reales). */
  projectedAdjust?: { incomeFactorBps: number; expenseFactorBps: number };
  /**
   * Estimaciones para días futuros (desde mañana): gasto variable mensual repartido por día
   * y pagos de deudas previstos. Se muestran aparte de lo programado.
   */
  estimates?: { variableExpenseMonthly: Minor; debtPayments: { date: ISODate; amount: Minor }[] };
}

export interface CashflowResult {
  buckets: CashflowBucket[];
  opening: Minor;
  closing: Minor;
  firstNegativeDate: ISODate | null;
  lowestBalance: Minor;
  lowestBalanceDate: ISODate;
  warnings: string[];
  accountIds: string[];
}

interface DayFlow {
  realIncome: Minor;
  realExpense: Minor;
  projectedIncome: Minor;
  projectedExpense: Minor;
  transfersNet: Minor;
  openings: Minor;
  estimated: Minor;
  overdue: number;
}

function bucketKey(date: ISODate, g: Granularity): { key: string; start: ISODate; end: ISODate } {
  if (g === "day") return { key: date, start: date, end: date };
  if (g === "week") {
    const s = weekStart(date);
    return { key: s, start: s, end: addDays(s, 6) };
  }
  const s = monthStart(date);
  return { key: s.slice(0, 7), start: s, end: monthEnd(date) };
}

function scale(amount: Minor, bps: number): Minor {
  return Math.round((amount * bps) / 10000);
}

export function buildCashflow(opts: CashflowOptions): CashflowResult {
  const { from, to, today, baseCurrency, granularity } = opts;
  const rates = opts.rates ?? [];
  const filter = opts.accountFilter ?? ((a: EngineAccount) => a.isLiquid && !a.archived);
  const scope = opts.accounts.filter(filter);
  const scopeIds = new Set(scope.map((a) => a.id));
  const warnings: string[] = [];
  let missingRate = 0;

  const toBase = (amount: Minor, currency: string, date: ISODate): Minor => {
    const c = convert(amount, currency, baseCurrency, rates, date);
    if (c === null) {
      missingRate++;
      return 0;
    }
    return c;
  };

  // Si el rango empieza en el futuro, el recorrido arranca hoy para que el saldo
  // inicial del rango incluya lo previsto entre hoy y `from`.
  const scanStart = from <= today ? from : today;
  const openingDate = addDays(scanStart, -1);
  let scanOpening = 0;
  for (const a of scope) {
    scanOpening = add(scanOpening, toBase(accountBalance(a, opts.txs, openingDate), a.currency, openingDate));
  }

  const days = new Map<ISODate, DayFlow>();
  const flow = (d: ISODate) => {
    let f = days.get(d);
    if (!f) {
      f = { realIncome: 0, realExpense: 0, projectedIncome: 0, projectedExpense: 0, transfersNet: 0, openings: 0, estimated: 0, overdue: 0 };
      days.set(d, f);
    }
    return f;
  };

  const consider = (tx: EngineTx, date: ISODate, projected: boolean) => {
    if (date < scanStart || date > to) return;
    const inSource = scopeIds.has(tx.accountId);
    if (tx.kind === "transfer") {
      const inDest = tx.toAccountId ? scopeIds.has(tx.toAccountId) : false;
      if (inSource === inDest) return; // neutral dentro (o fuera) del alcance
      const f = flow(date);
      if (inSource) f.transfersNet -= toBase(tx.amount, tx.currency, date);
      else {
        const destCurrency = opts.accounts.find((a) => a.id === tx.toAccountId)?.currency ?? tx.currency;
        f.transfersNet += toBase(tx.toAmount ?? tx.amount, destCurrency, date);
      }
      return;
    }
    if (!inSource) return;
    const f = flow(date);
    const amount = toBase(tx.amount, tx.currency, date);
    if (projected) {
      if (tx.kind === "income") f.projectedIncome += amount;
      else f.projectedExpense += amount;
    } else if (tx.kind === "income") f.realIncome += amount;
    else f.realExpense += amount;
  };

  for (const a of scope) {
    if (a.openedOn >= scanStart && a.openedOn <= to && a.openingBalance !== 0) {
      flow(a.openedOn).openings += toBase(a.openingBalance, a.currency, a.openedOn);
    }
  }

  for (const tx of opts.txs) {
    if (tx.status === "cancelled") continue;
    if (tx.status === "posted") {
      consider(tx, effectiveDate(tx), false);
      continue;
    }
    // Previsto: si está vencido (fecha < hoy) se asume hoy y se marca como vencido.
    const overdue = tx.date < today;
    const d = overdue ? today : tx.date;
    if (d < scanStart || d > to) continue;
    consider(tx, d, true);
    if (overdue && scopeIds.has(tx.accountId)) flow(d).overdue++;
  }
  const projStart = scanStart > today ? scanStart : today;
  if (projStart <= to) {
    for (const v of virtualOccurrences(opts.rules, opts.txs, projStart, to)) consider(v, v.date, true);
    // Ocurrencias recurrentes de los últimos 31 días sin confirmar: se asumen hoy (vencidas).
    if (today >= scanStart && today <= to) {
      for (const v of virtualOccurrences(opts.rules, opts.txs, addDays(today, -OVERDUE_LOOKBACK_DAYS), addDays(today, -1))) {
        consider(v, today, true);
        if (scopeIds.has(v.accountId)) flow(today).overdue++;
      }
    }
  }

  if (opts.estimates) {
    const firstEst = addDays(today, 1) > scanStart ? addDays(today, 1) : scanStart;
    if (opts.estimates.variableExpenseMonthly > 0) {
      for (let d = firstEst; d <= to; d = addDays(d, 1)) {
        const { y, m } = parts(d);
        flow(d).estimated += Math.round(opts.estimates.variableExpenseMonthly / daysInMonth(y, m));
      }
    }
    for (const p of opts.estimates.debtPayments) {
      if (p.date >= today && p.date >= scanStart && p.date <= to) flow(p.date).estimated += p.amount;
    }
  }

  if (opts.projectedAdjust) {
    for (const f of days.values()) {
      f.projectedIncome = scale(f.projectedIncome, opts.projectedAdjust.incomeFactorBps);
      f.projectedExpense = scale(f.projectedExpense, opts.projectedAdjust.expenseFactorBps);
      f.estimated = scale(f.estimated, opts.projectedAdjust.expenseFactorBps);
    }
  }

  // Recorrido diario: saldo mínimo y primer saldo negativo.
  const buckets: CashflowBucket[] = [];
  let balance = scanOpening;
  let opening = scanOpening;
  let firstNegativeDate: ISODate | null = null;
  let lowestBalance = Number.POSITIVE_INFINITY;
  let lowestBalanceDate = from;
  let current: CashflowBucket | null = null;
  for (let d = scanStart; d <= to; d = addDays(d, 1)) {
    if (d === from) opening = balance;
    const f = days.get(d);
    const dayNet = f
      ? f.realIncome - f.realExpense + f.projectedIncome - f.projectedExpense - f.estimated + f.transfersNet + f.openings
      : 0;
    if (d < from) {
      balance += dayNet;
      continue;
    }
    const b = bucketKey(d, granularity);
    if (!current || current.key !== b.key) {
      if (current) buckets.push(current);
      const phase: CashflowBucket["phase"] = b.end < today ? "actual" : b.start > today ? "projected" : "mixed";
      current = {
        key: b.key,
        start: b.start < from ? from : b.start,
        end: b.end > to ? to : b.end,
        phase,
        opening: balance,
        realIncome: 0,
        realExpense: 0,
        projectedIncome: 0,
        projectedExpense: 0,
        transfersNet: 0,
        accountOpenings: 0,
        estimatedExpense: 0,
        closing: balance,
        minBalance: Number.POSITIVE_INFINITY,
        minBalanceDate: d,
        overdueCount: 0,
      };
    }
    if (f) {
      current.realIncome += f.realIncome;
      current.realExpense += f.realExpense;
      current.projectedIncome += f.projectedIncome;
      current.projectedExpense += f.projectedExpense;
      current.transfersNet += f.transfersNet;
      current.accountOpenings += f.openings;
      current.estimatedExpense += f.estimated;
      current.overdueCount += f.overdue;
    }
    balance += dayNet;
    current.closing = balance;
    if (balance < current.minBalance) {
      current.minBalance = balance;
      current.minBalanceDate = d;
    }
    if (balance < lowestBalance) {
      lowestBalance = balance;
      lowestBalanceDate = d;
    }
    if (balance < 0 && firstNegativeDate === null) firstNegativeDate = d;
  }
  if (current) buckets.push(current);
  if (!Number.isFinite(lowestBalance)) lowestBalance = opening;

  if (missingRate > 0) {
    warnings.push(
      `${missingRate} importe(s) en otra moneda no se incluyeron porque no hay una tasa de cambio registrada para su fecha.`,
    );
  }
  return {
    buckets,
    opening,
    closing: balance,
    firstNegativeDate,
    lowestBalance,
    lowestBalanceDate,
    warnings,
    accountIds: [...scopeIds],
  };
}

export interface CashflowAlert {
  kind: "deficit_period" | "negative_balance" | "payment_concentration" | "overdue";
  severity: "attention" | "critical";
  message: string;
  date: ISODate;
}

/** Alertas legibles a partir de un flujo de caja ya calculado. */
export function cashflowAlerts(result: CashflowResult, granularity: Granularity, locale = "es-CO"): CashflowAlert[] {
  const alerts: CashflowAlert[] = [];
  const unit = granularity === "month" ? "mes" : granularity === "week" ? "semana" : "día";
  if (result.firstNegativeDate) {
    alerts.push({
      kind: "negative_balance",
      severity: "critical",
      date: result.firstNegativeDate,
      message: `Tu caja podría quedar en negativo a partir del ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(result.firstNegativeDate))}.`,
    });
  }
  for (const b of result.buckets) {
    const income = b.realIncome + b.projectedIncome;
    const expense = b.realExpense + b.projectedExpense + b.estimatedExpense;
    if (granularity !== "day" && expense > income && b.phase !== "actual") {
      alerts.push({
        kind: "deficit_period",
        severity: "attention",
        date: b.start,
        message: `Déficit previsto en el ${unit} que inicia el ${b.start}: salen más recursos de los que entran.`,
      });
    }
    if (b.overdueCount > 0) {
      alerts.push({
        kind: "overdue",
        severity: "attention",
        date: b.start,
        message: `${b.overdueCount} movimiento(s) previsto(s) ya vencieron y siguen sin marcarse como realizados o anulados.`,
      });
    }
  }
  if (granularity === "week") {
    const projected = result.buckets.filter((b) => b.phase !== "actual");
    const totalOut = sum(projected.map((b) => b.projectedExpense));
    // La concentración se mide solo con pagos programados (no con estimaciones uniformes).
    const avg = projected.length ? totalOut / projected.length : 0;
    for (const b of projected) {
      if (avg > 0 && b.projectedExpense > avg * 1.75 && b.projectedExpense > 0) {
        alerts.push({
          kind: "payment_concentration",
          severity: "attention",
          date: b.start,
          message: `Semana del ${b.start}: concentra pagos por encima de 1,75 veces el promedio semanal previsto.`,
        });
      }
    }
  }
  return alerts;
}
