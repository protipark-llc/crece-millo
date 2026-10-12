import { and, asc, desc, eq, lt } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { budgetLines, budgets, categories } from "@/lib/db/schema";
import { monthStart } from "@/lib/finance/dates";
import { MoneyError, mulRatio, parseAmount } from "@/lib/money/money";
import { audit } from "./audit";
import { NotFoundError, UserFacingError } from "./errors";

function amount(text: string | null, currency: string, field: string, allowZero = true): number {
  if (!text) return 0;
  try {
    const v = parseAmount(text, currency);
    if (!allowZero && v === 0) throw new UserFacingError("El importe debe ser mayor que cero.", field);
    return v;
  } catch (e) {
    if (e instanceof MoneyError) throw new UserFacingError(e.message, field);
    throw e;
  }
}

export async function getBudgetForMonth(tx: Tx, userId: string, month: string) {
  const m = monthStart(month);
  const [budget] = await tx.select().from(budgets).where(and(eq(budgets.userId, userId), eq(budgets.month, m)));
  if (!budget) return null;
  const lines = await tx.select().from(budgetLines).where(and(eq(budgetLines.userId, userId), eq(budgetLines.budgetId, budget.id))).orderBy(asc(budgetLines.createdAt));
  return { budget, lines };
}

export async function listBudgetMonths(tx: Tx, userId: string) {
  return tx.select({ id: budgets.id, month: budgets.month }).from(budgets).where(eq(budgets.userId, userId)).orderBy(desc(budgets.month));
}

/** Crea el presupuesto del mes: vacío o copiando las líneas de otro mes como plantilla. */
export async function createBudget(
  tx: Tx,
  userId: string,
  input: { month: string; currency: string; copyFromMonth: string | null; expectedIncome: string | null; savingsTarget: string | null; savingsPercent?: number | null },
) {
  const month = monthStart(input.month);
  let source: Awaited<ReturnType<typeof getBudgetForMonth>> = null;
  if (input.copyFromMonth) {
    source = await getBudgetForMonth(tx, userId, input.copyFromMonth);
    if (!source) throw new UserFacingError("No hay presupuesto en el mes que quieres copiar.");
  }
  const expectedIncome = input.expectedIncome ? amount(input.expectedIncome, input.currency, "expectedIncome") : (source?.budget.expectedIncome ?? null);
  let savingsTarget = input.savingsTarget ? amount(input.savingsTarget, input.currency, "savingsTarget") : (source?.budget.savingsTarget ?? 0);
  // Plantilla "págate primero" / 50-30-20: meta de ahorro sugerida como % del ingreso esperado.
  if (!input.savingsTarget && input.savingsPercent && expectedIncome) savingsTarget = mulRatio(expectedIncome, Math.round(input.savingsPercent * 100), 10000);
  const [budget] = await tx
    .insert(budgets)
    .values({ userId, month, currency: input.currency, expectedIncome, savingsTarget })
    .returning();
  if (source) {
    const validCats = new Set(
      (await tx.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId))).map((c) => c.id),
    );
    for (const l of source.lines) {
      if (!validCats.has(l.categoryId)) continue;
      await tx.insert(budgetLines).values({ userId, budgetId: budget!.id, categoryId: l.categoryId, planned: l.planned, annualAmount: l.annualAmount });
    }
  }
  await audit(tx, userId, "budget", budget!.id, "create", { month, copiedFrom: input.copyFromMonth });
  return budget!;
}

export async function previousBudgetMonth(tx: Tx, userId: string, month: string) {
  const [prev] = await tx
    .select({ month: budgets.month })
    .from(budgets)
    .where(and(eq(budgets.userId, userId), lt(budgets.month, monthStart(month))))
    .orderBy(desc(budgets.month))
    .limit(1);
  return prev?.month ?? null;
}

async function ownBudget(tx: Tx, userId: string, budgetId: string) {
  const [b] = await tx.select().from(budgets).where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));
  if (!b) throw new NotFoundError("El presupuesto");
  return b;
}

export async function updateBudgetMeta(
  tx: Tx,
  userId: string,
  budgetId: string,
  input: { expectedIncome: string | null; savingsTarget: string | null; notes: string | null; approve: boolean },
) {
  const b = await ownBudget(tx, userId, budgetId);
  await tx
    .update(budgets)
    .set({
      expectedIncome: input.expectedIncome ? amount(input.expectedIncome, b.currency, "expectedIncome") : null,
      savingsTarget: amount(input.savingsTarget, b.currency, "savingsTarget"),
      notes: input.notes,
      approvedAt: input.approve ? (b.approvedAt ?? new Date()) : null,
    })
    .where(and(eq(budgets.id, budgetId), eq(budgets.userId, userId)));
  await audit(tx, userId, "budget", budgetId, "update");
}

/**
 * Crea o actualiza la línea de una categoría. Si se indica un importe ANUAL, el mensual
 * es anual ÷ 12 (redondeo half-up): así se reserva cada mes una doceava parte de gastos
 * como impuestos, seguros o vacaciones.
 */
export async function upsertBudgetLine(
  tx: Tx,
  userId: string,
  input: { budgetId: string; categoryId: string; planned: string | null; annual: string | null },
) {
  const b = await ownBudget(tx, userId, input.budgetId);
  const [cat] = await tx.select().from(categories).where(and(eq(categories.id, input.categoryId), eq(categories.userId, userId)));
  if (!cat) throw new NotFoundError("La categoría");
  if (cat.kind !== "expense") throw new UserFacingError("Solo se presupuestan categorías de gasto.", "categoryId");
  const annual = input.annual ? amount(input.annual, b.currency, "annual") : null;
  const planned = annual !== null ? mulRatio(annual, 1, 12) : amount(input.planned, b.currency, "planned");
  await tx
    .insert(budgetLines)
    .values({ userId, budgetId: b.id, categoryId: cat.id, planned, annualAmount: annual })
    .onConflictDoUpdate({ target: [budgetLines.budgetId, budgetLines.categoryId], set: { planned, annualAmount: annual, updatedAt: new Date() } });
  await audit(tx, userId, "budget_line", `${b.id}:${cat.id}`, "upsert", { planned, annual });
}

export async function deleteBudgetLine(tx: Tx, userId: string, lineId: string) {
  const res = await tx.delete(budgetLines).where(and(eq(budgetLines.id, lineId), eq(budgetLines.userId, userId))).returning({ id: budgetLines.id });
  if (res.length === 0) throw new NotFoundError("La línea de presupuesto");
  await audit(tx, userId, "budget_line", lineId, "delete");
}

/** Mueve dinero presupuestado de una línea a otra del mismo presupuesto (transaccional). */
export async function reallocate(tx: Tx, userId: string, input: { fromLineId: string; toLineId: string; amount: string }) {
  if (input.fromLineId === input.toLineId) throw new UserFacingError("Elige dos categorías distintas.");
  const lines = await tx
    .select()
    .from(budgetLines)
    .where(and(eq(budgetLines.userId, userId)))
    .for("update");
  const from = lines.find((l) => l.id === input.fromLineId);
  const to = lines.find((l) => l.id === input.toLineId);
  if (!from || !to) throw new NotFoundError("La línea de presupuesto");
  if (from.budgetId !== to.budgetId) throw new UserFacingError("Las líneas deben pertenecer al mismo presupuesto.");
  const b = await ownBudget(tx, userId, from.budgetId);
  const value = amount(input.amount, b.currency, "amount", false);
  if (value > from.planned) throw new UserFacingError("No puedes mover más de lo presupuestado en la categoría de origen.", "amount");
  await tx.update(budgetLines).set({ planned: from.planned - value, annualAmount: null }).where(eq(budgetLines.id, from.id));
  await tx.update(budgetLines).set({ planned: to.planned + value, annualAmount: null }).where(eq(budgetLines.id, to.id));
  await audit(tx, userId, "budget", b.id, "reallocate", { from: from.categoryId, to: to.categoryId, amount: value });
}
