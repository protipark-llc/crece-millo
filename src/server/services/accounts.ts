import { and, asc, eq, or, sql } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { accounts, goals, recurrenceRules, transactions } from "@/lib/db/schema";
import { LIQUID_ACCOUNT_TYPES, type AccountType, type EngineAccount } from "@/lib/finance/types";
import { parseAmount, MoneyError } from "@/lib/money/money";
import type { AccountInput } from "../validation";
import { audit } from "./audit";
import { NotFoundError, UserFacingError } from "./errors";

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: "Efectivo",
  checking: "Cuenta corriente",
  savings: "Cuenta de ahorros",
  digital_wallet: "Billetera digital",
  investment: "Cuenta de inversión",
  other: "Otra",
};

export type AccountRow = typeof accounts.$inferSelect;

export function toEngineAccount(r: AccountRow): EngineAccount {
  return {
    id: r.id,
    name: r.name,
    type: r.type,
    currency: r.currency,
    openingBalance: r.openingBalance,
    openedOn: r.openedOn,
    isLiquid: r.isLiquid,
    archived: r.archivedAt !== null,
  };
}

export async function listAccounts(tx: Tx, userId: string) {
  return tx.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.archivedAt), asc(accounts.createdAt));
}

export async function getAccount(tx: Tx, userId: string, id: string) {
  const [row] = await tx.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  if (!row) throw new NotFoundError("La cuenta");
  return row;
}

function parseOpening(input: AccountInput): number {
  try {
    const v = input.openingBalance.trim() === "" ? 0 : parseAmount(input.openingBalance, input.currency);
    return input.openingNegative ? -v : v;
  } catch (e) {
    if (e instanceof MoneyError) throw new UserFacingError(e.message, "openingBalance");
    throw e;
  }
}

export async function createAccount(tx: Tx, userId: string, input: AccountInput) {
  const [row] = await tx
    .insert(accounts)
    .values({
      userId,
      name: input.name,
      type: input.type,
      currency: input.currency,
      openingBalance: parseOpening(input),
      openedOn: input.openedOn,
      isLiquid: LIQUID_ACCOUNT_TYPES.includes(input.type),
      notes: input.notes,
    })
    .returning();
  await audit(tx, userId, "account", row!.id, "create", { name: row!.name, openingBalance: row!.openingBalance });
  return row!;
}

export async function updateAccount(tx: Tx, userId: string, id: string, input: AccountInput) {
  const current = await getAccount(tx, userId, id);
  const [{ n } = { n: 0 }] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), or(eq(transactions.accountId, id), eq(transactions.toAccountId, id))));
  if (n > 0 && input.currency !== current.currency) {
    throw new UserFacingError("No puedes cambiar la moneda de una cuenta que ya tiene movimientos.", "currency");
  }
  if (n > 0 && input.openedOn > current.openedOn) {
    const [{ earliest } = { earliest: null }] = await tx
      .select({ earliest: sql<string | null>`min(coalesce(${transactions.postedOn}, ${transactions.date}))::text` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), or(eq(transactions.accountId, id), eq(transactions.toAccountId, id))));
    if (earliest && earliest < input.openedOn) {
      throw new UserFacingError("Hay movimientos anteriores a esa fecha de apertura.", "openedOn");
    }
  }
  const [row] = await tx
    .update(accounts)
    .set({
      name: input.name,
      type: input.type,
      currency: input.currency,
      openingBalance: parseOpening(input),
      openedOn: input.openedOn,
      isLiquid: LIQUID_ACCOUNT_TYPES.includes(input.type),
      notes: input.notes,
    })
    .where(and(eq(accounts.id, id), eq(accounts.userId, userId)))
    .returning();
  await audit(tx, userId, "account", id, "update", { before: { openingBalance: current.openingBalance, name: current.name }, after: { openingBalance: row!.openingBalance, name: row!.name } });
  return row!;
}

export async function setAccountArchived(tx: Tx, userId: string, id: string, archived: boolean) {
  await getAccount(tx, userId, id);
  await tx.update(accounts).set({ archivedAt: archived ? new Date() : null }).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  await audit(tx, userId, "account", id, archived ? "archive" : "unarchive");
}

/** Solo se elimina una cuenta sin movimientos ni reglas; con historia, se archiva. */
export async function deleteAccount(tx: Tx, userId: string, id: string) {
  await getAccount(tx, userId, id);
  const usage = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), or(eq(transactions.accountId, id), eq(transactions.toAccountId, id))));
  const rules = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(recurrenceRules)
    .where(and(eq(recurrenceRules.userId, userId), or(eq(recurrenceRules.accountId, id), eq(recurrenceRules.toAccountId, id))));
  if ((usage[0]?.n ?? 0) > 0 || (rules[0]?.n ?? 0) > 0) {
    throw new UserFacingError("La cuenta tiene movimientos o recurrencias. Archívala para conservar la historia.");
  }
  await tx.update(goals).set({ accountId: null }).where(and(eq(goals.userId, userId), eq(goals.accountId, id)));
  await tx.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  await audit(tx, userId, "account", id, "delete");
}
