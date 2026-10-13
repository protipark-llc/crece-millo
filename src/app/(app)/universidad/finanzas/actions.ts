"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/action-utils";
import * as accountsSvc from "@/server/services/accounts";
import * as txSvc from "@/server/services/transactions";
import * as budgetSvc from "@/server/services/budgets";
import * as planSvc from "@/server/services/planning";
import * as catSvc from "@/server/services/categories";
import { saveScenario, deleteScenario } from "@/server/services/scenarios";
import { setDiagnosticStep, DIAGNOSTIC_STEPS, type DiagnosticStepKey } from "@/server/services/settings";
import { loadFinanceData, monthlyReferences } from "@/server/services/finance-data";
import { UserFacingError } from "@/server/services/errors";
import { BUDGET_TEMPLATES } from "@/lib/finance/budget";
import {
  accountInput,
  assetInput,
  categoryInput,
  checkbox,
  contributionInput,
  debtInput,
  debtPaymentInput,
  goalInput,
  isoDate,
  name,
  optionalAmountText,
  optionalIsoDate,
  optionalText,
  transactionInput,
  uuidStr,
  valuationInput,
} from "@/server/validation";

const F = "/universidad/finanzas";
const refresh = () => revalidatePath(F, "layout");
const withId = <T extends z.ZodRawShape>(shape: T) => z.object({ id: uuidStr, ...shape });

/* Cuentas */
export async function createAccountAction(_: ActionState, fd: FormData) {
  return runAction(accountInput, fd, async ({ tx, userId, input }) => {
    await accountsSvc.createAccount(tx, userId, input);
    refresh();
    return { message: "Cuenta creada." };
  });
}
export async function updateAccountAction(_: ActionState, fd: FormData) {
  return runAction(accountInput.extend({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await accountsSvc.updateAccount(tx, userId, input.id, input);
    refresh();
    return { message: "Cuenta actualizada.", redirectTo: `${F}/cuentas` };
  });
}
export async function archiveAccountAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr, archived: checkbox }), fd, async ({ tx, userId, input }) => {
    await accountsSvc.setAccountArchived(tx, userId, input.id, input.archived);
    refresh();
  });
}
export async function deleteAccountAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await accountsSvc.deleteAccount(tx, userId, input.id);
    refresh();
    return { redirectTo: `${F}/cuentas` };
  });
}

/* Movimientos */
export async function createTransactionAction(_: ActionState, fd: FormData) {
  return runAction(transactionInput, fd, async ({ tx, userId, input, today }) => {
    const { duplicates, replayed } = await txSvc.createTransaction(tx, userId, input, today);
    refresh();
    const label = input.kind === "income" ? "Ingreso" : input.kind === "expense" ? "Gasto" : "Transferencia";
    return {
      message: replayed ? "Ya estaba registrado; no se creó un duplicado." : `${label} registrado${input.frequency !== "once" ? " con su recurrencia" : ""}.`,
      warning: duplicates.length
        ? `Posible duplicado: ya existe "${duplicates[0]!.description}" con el mismo importe y cuenta (${duplicates[0]!.date}). Revísalo en Movimientos.`
        : undefined,
    };
  });
}
export async function updateTransactionAction(_: ActionState, fd: FormData) {
  return runAction(transactionInput.and(z.object({ id: uuidStr })), fd, async ({ tx, userId, input, today }) => {
    await txSvc.updateTransaction(tx, userId, input.id, input, today);
    refresh();
    return { message: "Movimiento actualizado.", redirectTo: `${F}/movimientos` };
  });
}
export async function deleteTransactionAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr, back: z.string().optional() }), fd, async ({ tx, userId, input }) => {
    await txSvc.deleteTransaction(tx, userId, input.id);
    refresh();
    return { redirectTo: input.back && input.back.startsWith(F) ? input.back : undefined };
  });
}
export async function setStatusAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr, status: z.enum(["posted", "cancelled", "planned"]), postedOn: optionalIsoDate }), fd, async ({ tx, userId, input, today }) => {
    await txSvc.setTransactionStatus(tx, userId, input.id, input.status, input.postedOn, today);
    refresh();
  });
}
export async function reconcileAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr, reconciled: checkbox }), fd, async ({ tx, userId, input }) => {
    await txSvc.setReconciled(tx, userId, input.id, input.reconciled);
    refresh();
  });
}
export async function confirmOccurrenceAction(_: ActionState, fd: FormData) {
  return runAction(
    z.object({ ruleId: uuidStr, occurrenceDate: isoDate, op: z.enum(["post", "skip"]) }),
    fd,
    async ({ tx, userId, input, today }) => {
      await txSvc.confirmOccurrence(tx, userId, { ruleId: input.ruleId, occurrenceDate: input.occurrenceDate, action: input.op }, today);
      refresh();
    },
  );
}
export async function updateRuleAction(_: ActionState, fd: FormData) {
  return runAction(withId({ amount: optionalAmountText, description: name, endDate: optionalIsoDate, active: checkbox }), fd, async ({ tx, userId, input }) => {
    await txSvc.updateRule(tx, userId, input.id, { amountText: input.amount, description: input.description, endDate: input.endDate, active: input.active });
    refresh();
    return { message: "Recurrencia actualizada." };
  });
}
export async function deleteRuleAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await txSvc.deleteRule(tx, userId, input.id);
    refresh();
  });
}

/* Categorías */
export async function createCategoryAction(_: ActionState, fd: FormData) {
  return runAction(categoryInput, fd, async ({ tx, userId, input }) => {
    await catSvc.createCategory(tx, userId, input);
    refresh();
    return { message: "Categoría creada." };
  });
}
export async function updateCategoryAction(_: ActionState, fd: FormData) {
  return runAction(categoryInput.extend({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await catSvc.renameCategory(tx, userId, input.id, input.name, input.nature, input.behavior);
    refresh();
    return { message: "Categoría actualizada." };
  });
}
export async function archiveCategoryAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr, archived: checkbox }), fd, async ({ tx, userId, input }) => {
    await catSvc.setCategoryArchived(tx, userId, input.id, input.archived);
    refresh();
  });
}

/* Presupuesto */
export async function createBudgetAction(_: ActionState, fd: FormData) {
  return runAction(
    z.object({ month: isoDate, currency: z.string().length(3), copyFromMonth: optionalIsoDate, expectedIncome: optionalAmountText, savingsTarget: optionalAmountText, template: z.string().optional() }),
    fd,
    async ({ tx, userId, input }) => {
      const tpl = input.template && input.template in BUDGET_TEMPLATES ? BUDGET_TEMPLATES[input.template as keyof typeof BUDGET_TEMPLATES] : null;
      const b = await budgetSvc.createBudget(tx, userId, { ...input, savingsPercent: tpl?.split?.savings ?? null });
      refresh();
      return { message: "Presupuesto creado.", redirectTo: `${F}/presupuesto?mes=${b.month.slice(0, 7)}` };
    },
  );
}
export async function updateBudgetAction(_: ActionState, fd: FormData) {
  return runAction(withId({ expectedIncome: optionalAmountText, savingsTarget: optionalAmountText, notes: optionalText(), approve: checkbox }), fd, async ({ tx, userId, input }) => {
    await budgetSvc.updateBudgetMeta(tx, userId, input.id, input);
    refresh();
    return { message: "Presupuesto actualizado." };
  });
}
export async function upsertBudgetLineAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ budgetId: uuidStr, categoryId: uuidStr, planned: optionalAmountText, annual: optionalAmountText }), fd, async ({ tx, userId, input }) => {
    if (!input.planned && !input.annual) throw new UserFacingError("Indica un importe mensual o anual.", "planned");
    await budgetSvc.upsertBudgetLine(tx, userId, input);
    refresh();
    return { message: "Línea guardada." };
  });
}
export async function deleteBudgetLineAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await budgetSvc.deleteBudgetLine(tx, userId, input.id);
    refresh();
  });
}
export async function reallocateAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ fromLineId: uuidStr, toLineId: uuidStr, amount: z.string().trim().min(1, "Ingresa un importe") }), fd, async ({ tx, userId, input }) => {
    await budgetSvc.reallocate(tx, userId, input);
    refresh();
    return { message: "Presupuesto reasignado." };
  });
}

/* Deudas */
export async function createDebtAction(_: ActionState, fd: FormData) {
  return runAction(debtInput, fd, async ({ tx, userId, input }) => {
    await planSvc.createDebt(tx, userId, input);
    refresh();
    return { message: "Deuda registrada.", redirectTo: `${F}/deudas` };
  });
}
export async function updateDebtAction(_: ActionState, fd: FormData) {
  return runAction(debtInput.extend({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await planSvc.updateDebt(tx, userId, input.id, input);
    refresh();
    return { message: "Deuda actualizada.", redirectTo: `${F}/deudas` };
  });
}
export async function deleteDebtAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await planSvc.deleteDebt(tx, userId, input.id);
    refresh();
    return { redirectTo: `${F}/deudas` };
  });
}
export async function recordPaymentAction(_: ActionState, fd: FormData) {
  return runAction(debtPaymentInput, fd, async ({ tx, userId, input, today }) => {
    const r = await planSvc.recordDebtPayment(tx, userId, input, today);
    refresh();
    if (r.replayed) return { message: "El pago ya estaba registrado." };
    return {
      message: "Pago registrado: se descontó de la cuenta y se abonó a la deuda.",
      warning: r.estimated ? "Los intereses se estimaron con la tasa registrada. Si tu extracto muestra otra cifra, elimina el pago y regístralo con el desglose exacto." : undefined,
    };
  });
}
export async function deletePaymentAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await planSvc.deleteDebtPayment(tx, userId, input.id);
    refresh();
  });
}

/* Patrimonio */
export async function createAssetAction(_: ActionState, fd: FormData) {
  return runAction(assetInput, fd, async ({ tx, userId, input }) => {
    await planSvc.createAsset(tx, userId, input);
    refresh();
    return { message: "Activo registrado.", redirectTo: `${F}/patrimonio` };
  });
}
export async function updateAssetAction(_: ActionState, fd: FormData) {
  return runAction(withId({ name, liquidity: z.enum(["liquid", "semi_liquid", "illiquid"]), notes: optionalText() }), fd, async ({ tx, userId, input }) => {
    await planSvc.updateAsset(tx, userId, input.id, input);
    refresh();
    return { message: "Activo actualizado." };
  });
}
export async function addValuationAction(_: ActionState, fd: FormData) {
  return runAction(valuationInput, fd, async ({ tx, userId, input }) => {
    await planSvc.addValuation(tx, userId, input);
    refresh();
    return { message: "Valoración registrada." };
  });
}
export async function deleteAssetAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await planSvc.deleteAsset(tx, userId, input.id);
    refresh();
    return { redirectTo: `${F}/patrimonio` };
  });
}

/* Objetivos */
async function emergencyTarget(tx: Parameters<Parameters<typeof runAction>[2]>[0]["tx"], userId: string, input: z.infer<typeof goalInput>) {
  if (input.type !== "emergency_fund" || input.targetAmount || !input.emergencyMonthsTarget) return null;
  const d = await loadFinanceData(tx, userId);
  const ref = monthlyReferences(d).essential;
  if (!ref) return null;
  return ref * input.emergencyMonthsTarget;
}
export async function createGoalAction(_: ActionState, fd: FormData) {
  return runAction(goalInput, fd, async ({ tx, userId, input, today }) => {
    await planSvc.createGoal(tx, userId, input, today, await emergencyTarget(tx, userId, input));
    refresh();
    return { message: "Objetivo creado.", redirectTo: `${F}/objetivos` };
  });
}
export async function updateGoalAction(_: ActionState, fd: FormData) {
  return runAction(goalInput.extend({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await planSvc.updateGoal(tx, userId, input.id, input, await emergencyTarget(tx, userId, input));
    refresh();
    return { message: "Objetivo actualizado.", redirectTo: `${F}/objetivos` };
  });
}
export async function goalStatusAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr, status: z.enum(["active", "achieved", "paused", "archived"]) }), fd, async ({ tx, userId, input }) => {
    await planSvc.setGoalStatus(tx, userId, input.id, input.status);
    refresh();
  });
}
export async function deleteGoalAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await planSvc.deleteGoal(tx, userId, input.id);
    refresh();
    return { redirectTo: `${F}/objetivos` };
  });
}
export async function contributionAction(_: ActionState, fd: FormData) {
  return runAction(contributionInput, fd, async ({ tx, userId, input, today }) => {
    await planSvc.addContribution(tx, userId, input, today);
    refresh();
    return { message: input.direction === "in" ? "Aporte registrado." : "Retiro registrado." };
  });
}
export async function deleteContributionAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await planSvc.deleteContribution(tx, userId, input.id);
    refresh();
  });
}

/* Diagnóstico */
export async function diagnosticStepAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ step: z.enum(DIAGNOSTIC_STEPS.map((s) => s.key) as [DiagnosticStepKey, ...DiagnosticStepKey[]]), done: checkbox }), fd, async ({ tx, userId, input }) => {
    await setDiagnosticStep(tx, userId, input.step, input.done);
    refresh();
  });
}

/* Escenarios: solo se guardan los supuestos; nunca se modifican datos reales. */
export async function saveScenarioAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ name, assumptions: z.string().max(5000) }), fd, async ({ tx, userId, input }) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input.assumptions);
    } catch {
      throw new UserFacingError("Supuestos inválidos.");
    }
    await saveScenario(tx, userId, input.name, parsed);
    refresh();
    return { message: "Escenario guardado." };
  });
}
export async function deleteScenarioAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await deleteScenario(tx, userId, input.id);
    refresh();
  });
}

