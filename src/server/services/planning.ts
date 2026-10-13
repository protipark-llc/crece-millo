/** Deudas, activos (patrimonio) y objetivos de ahorro. */
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Tx } from "@/lib/db/client";
import {
  assetValuations,
  assets,
  categories,
  debtPayments,
  debts,
  goalContributions,
  goals,
  recurrenceRules,
  transactions,
} from "@/lib/db/schema";
import { monthlyRate, splitPayment, type RateBasis } from "@/lib/finance/debt";
import { debtBalanceAt } from "@/lib/finance/networth";
import { MoneyError, parseAmount } from "@/lib/money/money";
import type { assetInput, contributionInput, debtInput, debtPaymentInput, goalInput, valuationInput } from "../validation";
import { getAccount } from "./accounts";
import { audit } from "./audit";
import { NotFoundError, UserFacingError } from "./errors";

function amt(text: string | null | undefined, currency: string, field: string, opts: { positive?: boolean } = {}): number | null {
  if (!text) return null;
  try {
    const v = parseAmount(text, currency);
    if (opts.positive && v <= 0) throw new UserFacingError("El importe debe ser mayor que cero.", field);
    return v;
  } catch (e) {
    if (e instanceof MoneyError) throw new UserFacingError(e.message, field);
    throw e;
  }
}

/* ───────────── Deudas ───────────── */

export type DebtRow = typeof debts.$inferSelect;
export type DebtPaymentRow = typeof debtPayments.$inferSelect;

export const DEBT_TYPE_LABELS: Record<DebtRow["type"], string> = {
  credit_card: "Tarjeta de crédito",
  mortgage: "Hipoteca / leasing habitacional",
  vehicle: "Crédito de vehículo",
  personal_loan: "Préstamo personal / libre inversión",
  student_loan: "Crédito educativo (p. ej. ICETEX)",
  family: "Deuda familiar",
  employer: "Deuda con la empresa",
  informal: "Préstamo informal",
  other: "Otra",
};

export function debtMonthlyRate(d: Pick<DebtRow, "ratePercent" | "rateBasis">): number | null {
  if (d.ratePercent === null || d.rateBasis === null) return null;
  return monthlyRate(Number(d.ratePercent), d.rateBasis as RateBasis);
}

export async function listDebts(tx: Tx, userId: string) {
  const rows = await tx.select().from(debts).where(eq(debts.userId, userId)).orderBy(asc(debts.status), asc(debts.createdAt));
  const payments = await tx.select().from(debtPayments).where(eq(debtPayments.userId, userId)).orderBy(desc(debtPayments.paidOn));
  return groupDebts(rows, payments);
}

export function groupDebts(rows: (typeof debts.$inferSelect)[], payments: (typeof debtPayments.$inferSelect)[]) {
  return rows.map((d) => ({ debt: d, payments: payments.filter((p) => p.debtId === d.id) }));
}

function debtValues(input: z.infer<typeof debtInput>) {
  if ((input.ratePercent === null) !== (input.rateBasis === null)) {
    throw new UserFacingError("Indica la tasa y su tipo (E.A., N.A.M.V. o mensual), o deja ambos vacíos si no la conoces.", "rateBasis");
  }
  return {
    name: input.name,
    creditor: input.creditor,
    type: input.type,
    currency: input.currency,
    openingBalance: amt(input.openingBalance, input.currency, "openingBalance") ?? 0,
    balanceDate: input.balanceDate,
    ratePercent: input.ratePercent === null ? null : String(input.ratePercent),
    rateBasis: input.rateBasis,
    minimumPayment: amt(input.minimumPayment, input.currency, "minimumPayment"),
    paymentDay: input.paymentDay,
    remainingTermMonths: input.remainingTermMonths,
    monthlyFees: amt(input.monthlyFees, input.currency, "monthlyFees") ?? 0,
    daysPastDue: input.daysPastDue ?? 0,
    arrearsAmount: amt(input.arrearsAmount, input.currency, "arrearsAmount"),
    securedAssetId: input.securedAssetId,
    customPriority: input.customPriority,
    status: input.status,
    notes: input.notes,
  };
}

async function assertAsset(tx: Tx, userId: string, id: string | null) {
  if (!id) return;
  const [a] = await tx.select({ id: assets.id }).from(assets).where(and(eq(assets.id, id), eq(assets.userId, userId)));
  if (!a) throw new NotFoundError("El activo asociado");
}

export async function createDebt(tx: Tx, userId: string, input: z.infer<typeof debtInput>) {
  const values = debtValues(input);
  await assertAsset(tx, userId, values.securedAssetId);
  const [row] = await tx.insert(debts).values({ userId, ...values }).returning();
  await audit(tx, userId, "debt", row!.id, "create", { openingBalance: row!.openingBalance });
  return row!;
}

async function getDebt(tx: Tx, userId: string, id: string) {
  const [d] = await tx.select().from(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)));
  if (!d) throw new NotFoundError("La deuda");
  return d;
}

export async function updateDebt(tx: Tx, userId: string, id: string, input: z.infer<typeof debtInput>) {
  const current = await getDebt(tx, userId, id);
  const values = debtValues(input);
  await assertAsset(tx, userId, values.securedAssetId);
  const [{ n } = { n: 0 }] = await tx.select({ n: sql<number>`count(*)::int` }).from(debtPayments).where(eq(debtPayments.debtId, id));
  if (n > 0 && values.currency !== current.currency) throw new UserFacingError("No puedes cambiar la moneda de una deuda con pagos.", "currency");
  await tx.update(debts).set(values).where(and(eq(debts.id, id), eq(debts.userId, userId)));
  await audit(tx, userId, "debt", id, "update", { before: { openingBalance: current.openingBalance }, after: { openingBalance: values.openingBalance } });
}

/** Elimina la deuda y sus pagos. Los movimientos de caja de esos pagos se conservan (ocurrieron). */
export async function deleteDebt(tx: Tx, userId: string, id: string) {
  await getDebt(tx, userId, id);
  await tx.delete(debtPayments).where(and(eq(debtPayments.userId, userId), eq(debtPayments.debtId, id)));
  await tx.update(transactions).set({ debtId: null }).where(and(eq(transactions.userId, userId), eq(transactions.debtId, id)));
  await tx.update(recurrenceRules).set({ debtId: null }).where(and(eq(recurrenceRules.userId, userId), eq(recurrenceRules.debtId, id)));
  await tx.delete(debts).where(and(eq(debts.id, id), eq(debts.userId, userId)));
  await audit(tx, userId, "debt", id, "delete");
}

/**
 * Registra un pago de deuda de forma transaccional:
 * 1) un gasto realizado en la cuenta de origen, categoría "Deudas" (afecta caja y presupuesto);
 * 2) el desglose en la deuda: intereses, cargos y abono a capital (reduce el pasivo).
 * Si no se indica el interés, se estima con un mes de interés sobre el saldo y se marca como estimado.
 */
export async function recordDebtPayment(tx: Tx, userId: string, input: z.infer<typeof debtPaymentInput>, today: string) {
  if (input.idempotencyKey) {
    const [existing] = await tx
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.idempotencyKey, input.idempotencyKey)));
    if (existing) return { replayed: true };
  }
  const debt = await getDebt(tx, userId, input.debtId);
  const account = await getAccount(tx, userId, input.accountId);
  if (account.currency !== debt.currency) {
    throw new UserFacingError(`La cuenta está en ${account.currency} y la deuda en ${debt.currency}. Registra primero una transferencia con conversión.`, "accountId");
  }
  if (input.paidOn > today) throw new UserFacingError("El pago no puede tener fecha futura.", "paidOn");
  if (input.paidOn < debt.balanceDate) throw new UserFacingError(`La fecha es anterior a la fecha del saldo registrado (${debt.balanceDate}).`, "paidOn");
  if (input.paidOn < account.openedOn) throw new UserFacingError("La fecha es anterior a la apertura de la cuenta.", "paidOn");
  const amount = amt(input.amount, debt.currency, "amount", { positive: true })!;
  const payments = await tx.select().from(debtPayments).where(eq(debtPayments.debtId, debt.id));
  const balance =
    debtBalanceAt(
      { id: debt.id, name: debt.name, currency: debt.currency, openingBalance: debt.openingBalance, balanceDate: debt.balanceDate, payments: payments.map((p) => ({ date: p.paidOn, principal: p.principal })) },
      "9999-12-31",
    ) ?? 0;
  let interest: number;
  let fees: number;
  let estimated = false;
  if (input.interest !== null || input.fees !== null) {
    interest = amt(input.interest, debt.currency, "interest") ?? 0;
    fees = amt(input.fees, debt.currency, "fees") ?? 0;
    if (interest + fees > amount) throw new UserFacingError("Intereses y cargos no pueden superar el pago.", "interest");
  } else {
    const split = splitPayment(amount, balance, debtMonthlyRate(debt), debt.monthlyFees);
    interest = split.interest;
    fees = split.fees;
    estimated = true;
  }
  const principal = amount - interest - fees;
  if (principal > balance) {
    throw new UserFacingError(`El abono a capital (${principal / 100}) supera el saldo pendiente. Revisa el importe o los intereses.`, "amount");
  }
  const [debtCategory] = await tx
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.systemKey, "debts")));
  const [movement] = await tx
    .insert(transactions)
    .values({
      userId,
      kind: "expense",
      status: "posted",
      amount,
      currency: debt.currency,
      accountId: account.id,
      date: input.paidOn,
      postedOn: input.paidOn,
      categoryId: debtCategory?.id ?? null,
      nature: "essential",
      description: `Pago ${debt.name}${input.isExtra ? " (abono extra)" : ""}`,
      counterparty: debt.creditor,
      debtId: debt.id,
      idempotencyKey: input.idempotencyKey,
    })
    .returning({ id: transactions.id });
  await tx.insert(debtPayments).values({
    userId,
    debtId: debt.id,
    transactionId: movement!.id,
    paidOn: input.paidOn,
    amount,
    interest,
    fees,
    principal,
    isExtra: input.isExtra,
    interestEstimated: estimated,
  });
  if (principal === balance) await tx.update(debts).set({ status: "paid_off" }).where(eq(debts.id, debt.id));
  await audit(tx, userId, "debt_payment", debt.id, "create", { amount, interest, fees, principal, estimated });
  return { replayed: false, principal, interest, fees, estimated, remaining: balance - principal };
}

export async function deleteDebtPayment(tx: Tx, userId: string, paymentId: string) {
  const [p] = await tx.select().from(debtPayments).where(and(eq(debtPayments.id, paymentId), eq(debtPayments.userId, userId)));
  if (!p) throw new NotFoundError("El pago");
  if (p.transactionId) await tx.delete(transactions).where(and(eq(transactions.id, p.transactionId), eq(transactions.userId, userId)));
  else await tx.delete(debtPayments).where(eq(debtPayments.id, p.id));
  await tx.update(debts).set({ status: "active" }).where(and(eq(debts.id, p.debtId), eq(debts.status, "paid_off")));
  await audit(tx, userId, "debt_payment", p.debtId, "delete", { amount: p.amount });
}

/* ───────────── Activos ───────────── */

export const ASSET_TYPE_LABELS: Record<(typeof assets.$inferSelect)["type"], string> = {
  real_estate: "Inmueble",
  vehicle: "Vehículo",
  investment: "Inversión (CDT, fondos, acciones)",
  business: "Participación en empresa",
  retirement: "Fondo de pensiones / cesantías",
  receivable: "Cuenta por cobrar (te deben)",
  valuables: "Muebles, joyas, arte",
  other: "Otro",
};

export async function listAssets(tx: Tx, userId: string) {
  const rows = await tx.select().from(assets).where(eq(assets.userId, userId)).orderBy(asc(assets.createdAt));
  const vals = await tx.select().from(assetValuations).where(eq(assetValuations.userId, userId)).orderBy(desc(assetValuations.valuedOn));
  return groupAssets(rows, vals);
}

export function groupAssets(rows: (typeof assets.$inferSelect)[], vals: (typeof assetValuations.$inferSelect)[]) {
  return rows.map((a) => ({ asset: a, valuations: vals.filter((v) => v.assetId === a.id) }));
}

export async function createAsset(tx: Tx, userId: string, input: z.infer<typeof assetInput>) {
  const value = amt(input.value, input.currency, "value") ?? 0;
  const [row] = await tx
    .insert(assets)
    .values({ userId, name: input.name, type: input.type, currency: input.currency, liquidity: input.liquidity, notes: input.notes })
    .returning();
  await tx.insert(assetValuations).values({ userId, assetId: row!.id, value, valuedOn: input.valuedOn, source: input.source });
  await audit(tx, userId, "asset", row!.id, "create", { value });
  return row!;
}

export async function updateAsset(tx: Tx, userId: string, id: string, input: { name: string; liquidity: "liquid" | "semi_liquid" | "illiquid"; notes: string | null }) {
  const res = await tx.update(assets).set(input).where(and(eq(assets.id, id), eq(assets.userId, userId))).returning({ id: assets.id });
  if (!res.length) throw new NotFoundError("El activo");
}

export async function addValuation(tx: Tx, userId: string, input: z.infer<typeof valuationInput>) {
  const [a] = await tx.select().from(assets).where(and(eq(assets.id, input.assetId), eq(assets.userId, userId)));
  if (!a) throw new NotFoundError("El activo");
  const value = amt(input.value, a.currency, "value") ?? 0;
  await tx.insert(assetValuations).values({ userId, assetId: a.id, value, valuedOn: input.valuedOn, source: input.source });
  await audit(tx, userId, "asset", a.id, "valuation", { value, valuedOn: input.valuedOn });
}

export async function deleteAsset(tx: Tx, userId: string, id: string) {
  const [a] = await tx.select().from(assets).where(and(eq(assets.id, id), eq(assets.userId, userId)));
  if (!a) throw new NotFoundError("El activo");
  await tx.update(debts).set({ securedAssetId: null }).where(and(eq(debts.userId, userId), eq(debts.securedAssetId, id)));
  await tx.delete(assets).where(and(eq(assets.id, id), eq(assets.userId, userId)));
  await audit(tx, userId, "asset", id, "delete");
}

/* ───────────── Objetivos ───────────── */

export const GOAL_TYPE_LABELS: Record<(typeof goals.$inferSelect)["type"], string> = {
  emergency_fund: "Fondo de emergencia",
  education: "Educación",
  housing: "Vivienda",
  travel: "Viajes",
  asset_purchase: "Compra de un bien",
  financial_independence: "Independencia financiera",
  investment: "Inversión",
  other: "Otro",
};

export async function listGoals(tx: Tx, userId: string) {
  const rows = await tx.select().from(goals).where(eq(goals.userId, userId)).orderBy(asc(goals.priority), asc(goals.createdAt));
  const contribs = await tx.select().from(goalContributions).where(eq(goalContributions.userId, userId)).orderBy(desc(goalContributions.contributedOn));
  return groupGoals(rows, contribs);
}

export function groupGoals(rows: (typeof goals.$inferSelect)[], contribs: (typeof goalContributions.$inferSelect)[]) {
  return rows.map((g) => {
    const list = contribs.filter((c) => c.goalId === g.id);
    return { goal: g, contributions: list, accumulated: list.reduce((s, c) => s + c.amount, 0) };
  });
}

export async function createGoal(
  tx: Tx,
  userId: string,
  input: z.infer<typeof goalInput>,
  today: string,
  computedTarget: number | null,
) {
  if (input.accountId) await getAccount(tx, userId, input.accountId);
  const target = amt(input.targetAmount, input.currency, "targetAmount", { positive: true }) ?? computedTarget;
  if (!target || target <= 0) throw new UserFacingError("Indica el monto objetivo.", "targetAmount");
  if (input.targetDate && input.targetDate <= today) throw new UserFacingError("La fecha objetivo debe ser futura.", "targetDate");
  const [row] = await tx
    .insert(goals)
    .values({
      userId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      targetAmount: target,
      targetDate: input.targetDate,
      priority: input.priority ?? 3,
      plannedMonthly: amt(input.plannedMonthly, input.currency, "plannedMonthly"),
      accountId: input.accountId,
      emergencyMonthsTarget: input.type === "emergency_fund" ? input.emergencyMonthsTarget : null,
      notes: input.notes,
    })
    .returning();
  const initial = amt(input.initialAmount, input.currency, "initialAmount");
  if (initial && initial > 0) {
    await tx.insert(goalContributions).values({ userId, goalId: row!.id, amount: initial, contributedOn: today, note: "Saldo inicial" });
  }
  await audit(tx, userId, "goal", row!.id, "create", { target });
  return row!;
}

async function getGoal(tx: Tx, userId: string, id: string) {
  const [g] = await tx.select().from(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  if (!g) throw new NotFoundError("El objetivo");
  return g;
}

export async function updateGoal(
  tx: Tx,
  userId: string,
  id: string,
  input: z.infer<typeof goalInput>,
  computedTarget: number | null,
) {
  const g = await getGoal(tx, userId, id);
  if (input.accountId) await getAccount(tx, userId, input.accountId);
  const target = amt(input.targetAmount, g.currency, "targetAmount", { positive: true }) ?? computedTarget ?? g.targetAmount;
  await tx
    .update(goals)
    .set({
      name: input.name,
      targetAmount: target,
      targetDate: input.targetDate,
      priority: input.priority ?? g.priority,
      plannedMonthly: amt(input.plannedMonthly, g.currency, "plannedMonthly"),
      accountId: input.accountId,
      emergencyMonthsTarget: g.type === "emergency_fund" ? input.emergencyMonthsTarget : null,
      notes: input.notes,
    })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  await audit(tx, userId, "goal", id, "update", { before: g.targetAmount, after: target });
}

export async function setGoalStatus(tx: Tx, userId: string, id: string, status: "active" | "achieved" | "paused" | "archived") {
  await getGoal(tx, userId, id);
  await tx
    .update(goals)
    .set({ status, achievedAt: status === "achieved" ? new Date() : null })
    .where(and(eq(goals.id, id), eq(goals.userId, userId)));
  await audit(tx, userId, "goal", id, `status_${status}`);
}

export async function deleteGoal(tx: Tx, userId: string, id: string) {
  await getGoal(tx, userId, id);
  await tx.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
  await audit(tx, userId, "goal", id, "delete");
}

/**
 * Aporte (o retiro) a un objetivo. Es una asignación de dinero que ya tienes: no mueve
 * saldo entre cuentas. Si quieres separar el dinero físicamente, registra además una
 * transferencia a la cuenta del objetivo.
 */
export async function addContribution(tx: Tx, userId: string, input: z.infer<typeof contributionInput>, today: string) {
  const g = await getGoal(tx, userId, input.goalId);
  if (input.contributedOn > today) throw new UserFacingError("La fecha no puede ser futura.", "contributedOn");
  const value = amt(input.amount, g.currency, "amount", { positive: true })!;
  const signed = input.direction === "out" ? -value : value;
  if (signed < 0) {
    const [{ total } = { total: 0 }] = await tx
      .select({ total: sql<number>`coalesce(sum(${goalContributions.amount}),0)::bigint` })
      .from(goalContributions)
      .where(eq(goalContributions.goalId, g.id));
    if (Number(total) + signed < 0) throw new UserFacingError("No puedes retirar más de lo acumulado.", "amount");
  }
  await tx.insert(goalContributions).values({ userId, goalId: g.id, amount: signed, contributedOn: input.contributedOn, note: input.note });
  const [{ total } = { total: 0 }] = await tx
    .select({ total: sql<number>`coalesce(sum(${goalContributions.amount}),0)::bigint` })
    .from(goalContributions)
    .where(eq(goalContributions.goalId, g.id));
  if (Number(total) >= g.targetAmount && g.status === "active") {
    await tx.update(goals).set({ status: "achieved", achievedAt: new Date() }).where(eq(goals.id, g.id));
  }
  await audit(tx, userId, "goal_contribution", g.id, "create", { amount: signed });
}

export async function deleteContribution(tx: Tx, userId: string, id: string) {
  const res = await tx.delete(goalContributions).where(and(eq(goalContributions.id, id), eq(goalContributions.userId, userId))).returning();
  if (!res.length) throw new NotFoundError("El aporte");
  await audit(tx, userId, "goal_contribution", res[0]!.goalId, "delete", { amount: res[0]!.amount });
}
