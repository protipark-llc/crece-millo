import { and, desc, eq, gte, inArray, lte, ne, or, sql } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { categories, recurrenceRules, transactions } from "@/lib/db/schema";
import { addDays } from "@/lib/finance/dates";
import { occurrences } from "@/lib/finance/recurrence";
import type { EngineRule, EngineTx } from "@/lib/finance/types";
import { MoneyError, parseAmount } from "@/lib/money/money";
import type { TransactionInput } from "../validation";
import { getAccount } from "./accounts";
import { audit } from "./audit";
import { NotFoundError, UserFacingError } from "./errors";

export type TxRow = typeof transactions.$inferSelect;
export type RuleRow = typeof recurrenceRules.$inferSelect;

export function toEngineTx(r: TxRow): EngineTx {
  return {
    id: r.id,
    kind: r.kind,
    status: r.status,
    amount: r.amount,
    currency: r.currency,
    accountId: r.accountId,
    toAccountId: r.toAccountId,
    toAmount: r.toAmount,
    date: r.date,
    postedOn: r.postedOn,
    categoryId: r.categoryId,
    nature: r.nature,
    reconciled: r.reconciled,
    recurrenceRuleId: r.recurrenceRuleId,
    occurrenceDate: r.occurrenceDate,
    debtId: r.debtId,
    description: r.description,
  };
}

export function toEngineRule(r: RuleRow): EngineRule {
  return {
    id: r.id,
    kind: r.kind,
    amount: r.amount,
    currency: r.currency,
    accountId: r.accountId,
    toAccountId: r.toAccountId,
    toAmount: r.toAmount,
    categoryId: r.categoryId,
    nature: r.nature,
    debtId: r.debtId,
    description: r.description,
    frequency: r.frequency,
    startDate: r.startDate,
    endDate: r.endDate,
    active: r.active,
  };
}

function money(text: string, currency: string, field: string): number {
  try {
    const v = parseAmount(text, currency);
    if (v <= 0) throw new UserFacingError("El importe debe ser mayor que cero.", field);
    return v;
  } catch (e) {
    if (e instanceof MoneyError) throw new UserFacingError(e.message, field);
    throw e;
  }
}

interface Resolved {
  kind: "income" | "expense" | "transfer";
  amount: number;
  currency: string;
  accountId: string;
  toAccountId: string | null;
  toAmount: number | null;
  categoryId: string | null;
  nature: "essential" | "discretionary" | null;
}

/** Valida referencias (propiedad, tipo de categoría, monedas) y convierte importes. */
async function resolve(tx: Tx, userId: string, input: TransactionInput): Promise<Resolved> {
  const account = await getAccount(tx, userId, input.accountId);
  if (account.archivedAt) throw new UserFacingError("La cuenta está archivada.", "accountId");
  if (input.date < account.openedOn || (input.postedOn && input.postedOn < account.openedOn)) {
    throw new UserFacingError(
      `La fecha es anterior a la apertura de la cuenta (${account.openedOn}). El saldo inicial ya incluye lo ocurrido antes.`,
      "date",
    );
  }
  const amount = money(input.amount, account.currency, "amount");
  let toAccountId: string | null = null;
  let toAmount: number | null = null;
  let categoryId: string | null = null;
  let nature = input.nature;
  if (input.kind === "transfer") {
    const dest = await getAccount(tx, userId, input.toAccountId!);
    if (dest.archivedAt) throw new UserFacingError("La cuenta destino está archivada.", "toAccountId");
    toAccountId = dest.id;
    if (dest.currency === account.currency) toAmount = amount;
    else {
      if (!input.toAmount) {
        throw new UserFacingError(`Las cuentas tienen monedas distintas: indica cuánto llegó en ${dest.currency}.`, "toAmount");
      }
      toAmount = money(input.toAmount, dest.currency, "toAmount");
    }
    nature = null;
  } else if (input.categoryId) {
    const [cat] = await tx
      .select()
      .from(categories)
      .where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)));
    if (!cat) throw new NotFoundError("La categoría");
    if (cat.kind !== input.kind) throw new UserFacingError("La categoría no corresponde al tipo de movimiento.", "categoryId");
    categoryId = cat.id;
    if (input.kind === "expense" && !nature) nature = cat.nature;
  }
  if (input.kind === "income") nature = null;
  return { kind: input.kind, amount, currency: account.currency, accountId: account.id, toAccountId, toAmount, categoryId, nature };
}

function postedOnFor(input: TransactionInput, today: string): string | null {
  if (input.status !== "posted") return null;
  const posted = input.postedOn ?? input.date;
  if (posted > today) {
    throw new UserFacingError("Un movimiento realizado no puede tener fecha futura. Regístralo como previsto.", "postedOn");
  }
  return posted;
}

/** Posibles duplicados: misma cuenta, tipo e importe a ±1 día (no anulados). */
export async function findPossibleDuplicates(tx: Tx, userId: string, r: Resolved, date: string, excludeId?: string) {
  const conds = [
    eq(transactions.userId, userId),
    eq(transactions.accountId, r.accountId),
    eq(transactions.kind, r.kind),
    eq(transactions.amount, r.amount),
    ne(transactions.status, "cancelled"),
    gte(transactions.date, addDays(date, -1)),
    lte(transactions.date, addDays(date, 1)),
  ];
  if (excludeId) conds.push(ne(transactions.id, excludeId));
  return tx.select({ id: transactions.id, description: transactions.description, date: transactions.date }).from(transactions).where(and(...conds)).limit(3);
}

export async function createTransaction(tx: Tx, userId: string, input: TransactionInput, today: string) {
  if (input.idempotencyKey) {
    const [existing] = await tx
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.idempotencyKey, input.idempotencyKey)));
    if (existing) return { row: existing, duplicates: [], replayed: true };
  }
  const r = await resolve(tx, userId, input);
  const postedOn = postedOnFor(input, today);
  const duplicates = await findPossibleDuplicates(tx, userId, r, input.date);
  let ruleId: string | null = null;
  if (input.frequency !== "once") {
    const [rule] = await tx
      .insert(recurrenceRules)
      .values({
        userId,
        kind: r.kind,
        amount: r.amount,
        currency: r.currency,
        accountId: r.accountId,
        toAccountId: r.toAccountId,
        toAmount: r.toAmount,
        categoryId: r.categoryId,
        nature: r.nature,
        incomeSource: input.kind === "income" ? input.incomeSource : null,
        description: input.description,
        counterparty: input.counterparty,
        frequency: input.frequency,
        startDate: input.date,
        endDate: input.endDate,
      })
      .returning({ id: recurrenceRules.id });
    ruleId = rule!.id;
    await audit(tx, userId, "recurrence_rule", ruleId, "create", { frequency: input.frequency, amount: r.amount });
  }
  const [row] = await tx
    .insert(transactions)
    .values({
      userId,
      kind: r.kind,
      status: input.status,
      amount: r.amount,
      currency: r.currency,
      accountId: r.accountId,
      toAccountId: r.toAccountId,
      toAmount: r.toAmount,
      date: input.date,
      postedOn,
      categoryId: r.categoryId,
      nature: r.nature,
      incomeSource: input.kind === "income" ? input.incomeSource : null,
      description: input.description,
      counterparty: input.counterparty,
      notes: input.notes,
      recurrenceRuleId: ruleId,
      occurrenceDate: ruleId ? input.date : null,
      idempotencyKey: input.idempotencyKey,
    })
    .returning();
  await audit(tx, userId, "transaction", row!.id, "create", { kind: row!.kind, status: row!.status, amount: row!.amount });
  return { row: row!, duplicates, replayed: false };
}

export async function getTransaction(tx: Tx, userId: string, id: string) {
  const [row] = await tx.select().from(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  if (!row) throw new NotFoundError("El movimiento");
  return row;
}

export async function updateTransaction(tx: Tx, userId: string, id: string, input: TransactionInput, today: string) {
  const current = await getTransaction(tx, userId, id);
  if (current.debtId) {
    throw new UserFacingError("Este movimiento es un pago de deuda. Edítalo desde el módulo de Deudas (elimina el pago y regístralo de nuevo).");
  }
  if (input.kind !== current.kind) throw new UserFacingError("No se puede cambiar el tipo de un movimiento existente.");
  const r = await resolve(tx, userId, input);
  const postedOn = postedOnFor(input, today);
  const [row] = await tx
    .update(transactions)
    .set({
      status: input.status,
      amount: r.amount,
      currency: r.currency,
      accountId: r.accountId,
      toAccountId: r.toAccountId,
      toAmount: r.toAmount,
      date: input.date,
      postedOn,
      categoryId: r.categoryId,
      nature: r.nature,
      incomeSource: input.kind === "income" ? input.incomeSource : null,
      description: input.description,
      counterparty: input.counterparty,
      notes: input.notes,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();
  await audit(tx, userId, "transaction", id, "update", {
    before: { amount: current.amount, status: current.status, date: current.date },
    after: { amount: row!.amount, status: row!.status, date: row!.date },
  });
  return row!;
}

/**
 * Eliminar: si el movimiento es una ocurrencia de una recurrencia, se anula en lugar de
 * borrarse, para que la recurrencia no lo vuelva a generar. Un pago de deuda se elimina
 * junto con su registro en la deuda (ON DELETE CASCADE).
 */
export async function deleteTransaction(tx: Tx, userId: string, id: string) {
  const current = await getTransaction(tx, userId, id);
  if (current.recurrenceRuleId) {
    await tx
      .update(transactions)
      .set({ status: "cancelled", postedOn: null })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    await audit(tx, userId, "transaction", id, "cancel_occurrence", { amount: current.amount });
    return { cancelledInstead: true };
  }
  await tx.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  await audit(tx, userId, "transaction", id, "delete", { amount: current.amount, kind: current.kind, date: current.date });
  return { cancelledInstead: false };
}

export async function setTransactionStatus(
  tx: Tx,
  userId: string,
  id: string,
  status: "posted" | "cancelled" | "planned",
  postedOn: string | null,
  today: string,
) {
  const current = await getTransaction(tx, userId, id);
  if (current.debtId && status !== "posted") {
    throw new UserFacingError("Los pagos de deuda se gestionan desde el módulo de Deudas.");
  }
  let effective: string | null = null;
  if (status === "posted") {
    effective = postedOn ?? (current.date <= today ? current.date : today);
    if (effective > today) throw new UserFacingError("La fecha efectiva no puede ser futura.");
  }
  await tx
    .update(transactions)
    .set({ status, postedOn: effective, reconciled: status === "posted" ? current.reconciled : false })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  await audit(tx, userId, "transaction", id, `status_${status}`, { from: current.status });
}

export async function setReconciled(tx: Tx, userId: string, id: string, reconciled: boolean) {
  const current = await getTransaction(tx, userId, id);
  if (current.status !== "posted") throw new UserFacingError("Solo se concilian movimientos realizados.");
  await tx.update(transactions).set({ reconciled }).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

/* ───────────── Recurrencias ───────────── */

export async function listRules(tx: Tx, userId: string) {
  return tx.select().from(recurrenceRules).where(eq(recurrenceRules.userId, userId)).orderBy(desc(recurrenceRules.createdAt));
}

async function getRule(tx: Tx, userId: string, id: string) {
  const [rule] = await tx.select().from(recurrenceRules).where(and(eq(recurrenceRules.id, id), eq(recurrenceRules.userId, userId)));
  if (!rule) throw new NotFoundError("La recurrencia");
  return rule;
}

/**
 * Materializa UNA ocurrencia de una regla como realizada ("post") u omitida ("skip").
 * Es idempotente: UNIQUE(recurrence_rule_id, occurrence_date) + ON CONFLICT DO NOTHING
 * garantizan que repetir la operación (doble clic, recarga) no cree un duplicado.
 */
export async function confirmOccurrence(
  tx: Tx,
  userId: string,
  input: { ruleId: string; occurrenceDate: string; action: "post" | "skip"; postedOn?: string | null; amount?: number | null },
  today: string,
) {
  const rule = await getRule(tx, userId, input.ruleId);
  if (!occurrences(rule, input.occurrenceDate, input.occurrenceDate).includes(input.occurrenceDate)) {
    throw new UserFacingError("La fecha no corresponde a una ocurrencia de esta recurrencia.");
  }
  const postedOn = input.action === "post" ? (input.postedOn ?? (input.occurrenceDate <= today ? input.occurrenceDate : today)) : null;
  if (postedOn && postedOn > today) throw new UserFacingError("La fecha efectiva no puede ser futura.");
  const inserted = await tx
    .insert(transactions)
    .values({
      userId,
      kind: rule.kind,
      status: input.action === "post" ? "posted" : "cancelled",
      amount: input.amount && input.amount > 0 ? input.amount : rule.amount,
      currency: rule.currency,
      accountId: rule.accountId,
      toAccountId: rule.toAccountId,
      toAmount: rule.toAmount,
      date: input.occurrenceDate,
      postedOn,
      categoryId: rule.categoryId,
      nature: rule.nature,
      incomeSource: rule.incomeSource,
      description: rule.description,
      counterparty: rule.counterparty,
      recurrenceRuleId: rule.id,
      occurrenceDate: input.occurrenceDate,
      debtId: null,
    })
    .onConflictDoNothing({ target: [transactions.recurrenceRuleId, transactions.occurrenceDate] })
    .returning();
  if (inserted.length === 0) throw new UserFacingError("Esta ocurrencia ya estaba registrada.");
  await audit(tx, userId, "transaction", inserted[0]!.id, input.action === "post" ? "post_occurrence" : "skip_occurrence");
  return inserted[0]!;
}

export async function updateRule(
  tx: Tx,
  userId: string,
  id: string,
  input: { amountText: string | null; description: string; endDate: string | null; active: boolean },
) {
  const rule = await getRule(tx, userId, id);
  const amount = input.amountText ? money(input.amountText, rule.currency, "amount") : rule.amount;
  if (input.endDate && input.endDate < rule.startDate) throw new UserFacingError("La fecha final es anterior al inicio.", "endDate");
  await tx
    .update(recurrenceRules)
    .set({ amount, description: input.description, endDate: input.endDate, active: input.active, toAmount: rule.toAccountId && rule.toAmount === rule.amount ? amount : rule.toAmount })
    .where(and(eq(recurrenceRules.id, id), eq(recurrenceRules.userId, userId)));
  await audit(tx, userId, "recurrence_rule", id, "update", { before: { amount: rule.amount }, after: { amount } });
}

/**
 * Eliminar una recurrencia: borra sus ocurrencias previstas o anuladas y conserva los
 * movimientos ya realizados (se desvinculan de la regla).
 */
export async function deleteRule(tx: Tx, userId: string, id: string) {
  await getRule(tx, userId, id);
  await tx
    .delete(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.recurrenceRuleId, id), ne(transactions.status, "posted")));
  await tx
    .update(transactions)
    .set({ recurrenceRuleId: null, occurrenceDate: null })
    .where(and(eq(transactions.userId, userId), eq(transactions.recurrenceRuleId, id)));
  await tx.delete(recurrenceRules).where(and(eq(recurrenceRules.id, id), eq(recurrenceRules.userId, userId)));
  await audit(tx, userId, "recurrence_rule", id, "delete");
}

export interface TxFilters {
  kind?: "income" | "expense" | "transfer";
  status?: "planned" | "posted" | "cancelled";
  accountId?: string;
  categoryIds?: string[];
  from?: string;
  to?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

export async function listTransactions(tx: Tx, userId: string, f: TxFilters) {
  const conds = [eq(transactions.userId, userId)];
  if (f.kind) conds.push(eq(transactions.kind, f.kind));
  if (f.status) conds.push(eq(transactions.status, f.status));
  if (f.accountId) conds.push(or(eq(transactions.accountId, f.accountId), eq(transactions.toAccountId, f.accountId))!);
  if (f.categoryIds && f.categoryIds.length) conds.push(inArray(transactions.categoryId, f.categoryIds));
  const dateExpr = sql`coalesce(${transactions.postedOn}, ${transactions.date})`;
  if (f.from) conds.push(sql`${dateExpr} >= ${f.from}`);
  if (f.to) conds.push(sql`${dateExpr} <= ${f.to}`);
  if (f.q) {
    const like = `%${f.q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
    conds.push(or(sql`${transactions.description} ILIKE ${like}`, sql`${transactions.counterparty} ILIKE ${like}`)!);
  }
  const where = and(...conds);
  const [{ total } = { total: 0 }] = await tx.select({ total: sql<number>`count(*)::int` }).from(transactions).where(where);
  const rows = await tx
    .select()
    .from(transactions)
    .where(where)
    .orderBy(desc(dateExpr), desc(transactions.createdAt))
    .limit(f.limit ?? 50)
    .offset(f.offset ?? 0);
  return { rows, total };
}
