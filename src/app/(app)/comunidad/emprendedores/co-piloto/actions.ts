"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/action-utils";
import { getSettings } from "@/server/services/settings";
import { PRODUCT_STATUSES, addTest, createProduct, deleteProduct, deleteTest, savePlan, setProductStatus, setRouteStep, updateProduct } from "@/server/services/copilot";
import { amountText, checkbox, isoDate, name, optionalAmountText, optionalDecimal, optionalText, uuidStr } from "@/server/validation";

const BASE = "/comunidad/emprendedores";
const refresh = () => revalidatePath(BASE, "layout");

const productInput = z.object({
  name,
  supplier: optionalText(120),
  status: z.enum(PRODUCT_STATUSES).default("idea"),
  productCost: amountText,
  shippingCost: amountText,
  otherCosts: optionalAmountText,
  returnShippingCost: optionalAmountText,
  paymentFeePct: optionalDecimal(0, 50),
  platformFeePct: optionalDecimal(0, 50),
  returnRatePct: optionalDecimal(0, 90),
  expectedCpa: optionalAmountText,
  targetMarginPct: optionalDecimal(0, 80),
  salePrice: optionalAmountText,
  notes: optionalText(),
});

export async function createProductAction(_: ActionState, fd: FormData) {
  return runAction(productInput, fd, async ({ tx, userId, input }) => {
    const s = await getSettings(tx, userId);
    const id = await createProduct(tx, userId, input, s.currency);
    refresh();
    return { message: "Producto creado.", redirectTo: `${BASE}/co-piloto/productos/${id}` };
  });
}

export async function updateProductAction(_: ActionState, fd: FormData) {
  return runAction(productInput.extend({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    const { id, ...rest } = input;
    await updateProduct(tx, userId, id, rest);
    refresh();
    return { message: "Cambios guardados. Los cálculos ya se actualizaron." };
  });
}

export async function setProductStatusAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr, status: z.enum(PRODUCT_STATUSES) }), fd, async ({ tx, userId, input }) => {
    await setProductStatus(tx, userId, input.id, input.status);
    refresh();
  });
}

export async function deleteProductAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await deleteProduct(tx, userId, input.id);
    refresh();
    return { redirectTo: `${BASE}/co-piloto` };
  });
}

export async function addTestAction(_: ActionState, fd: FormData) {
  return runAction(
    z.object({
      productId: uuidStr,
      startedOn: isoDate,
      days: z.coerce.number().int("Días enteros").min(1, "Al menos 1 día").max(90, "Máximo 90 días"),
      adSpend: amountText,
      orders: z.coerce.number().int("Ventas enteras").min(0, "No puede ser negativo").max(100000),
      channel: optionalText(60),
      notes: optionalText(),
    }),
    fd,
    async ({ tx, userId, input }) => {
      await addTest(tx, userId, input);
      refresh();
      return { message: "Test registrado. Mira el veredicto abajo." };
    },
  );
}

export async function deleteTestAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ id: uuidStr }), fd, async ({ tx, userId, input }) => {
    await deleteTest(tx, userId, input.id);
    refresh();
  });
}

export async function savePlanAction(_: ActionState, fd: FormData) {
  return runAction(
    z.object({ capital: amountText, reservePct: optionalDecimal(0, 100), monthlyFixed: optionalAmountText, testBudget: optionalAmountText }),
    fd,
    async ({ tx, userId, input }) => {
      const s = await getSettings(tx, userId);
      await savePlan(tx, userId, input, s.currency);
      refresh();
      return { message: "Plan de capital guardado." };
    },
  );
}

export async function routeStepAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ step: z.string().max(40), done: checkbox }), fd, async ({ tx, userId, input }) => {
    await setRouteStep(tx, userId, input.step, input.done);
    refresh();
  });
}
