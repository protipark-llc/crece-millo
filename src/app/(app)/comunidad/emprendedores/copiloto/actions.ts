"use server";

import { z } from "zod";
import { withUser } from "@/lib/db/client";
import {
  productSchema,
  savedSchema,
  testSchema,
  type Product,
  type Saved,
  type Test,
} from "@/lib/copiloto/state";
import { getCurrentUser } from "@/server/session";
import { UserFacingError } from "@/server/services/errors";
import {
  putProduct,
  putProductState,
  putSaved,
  putTest,
  removeProduct,
  removeSaved,
  removeTest,
  saveSettings,
  type SettingsPatch,
} from "@/server/services/copiloto";
import type { Tx } from "@/lib/db/client";

/**
 * Guardado del Co-Piloto. La interfaz cambia el estado al instante en el navegador y llama
 * estas acciones en segundo plano (con espera corta al escribir). Cada una valida su entrada:
 * nada llega a la base sin pasar por zod y por RLS.
 */
export type SaveResult = { ok: true } | { ok: false; error: string };

const MAX_JSON = 200_000;
const id = z.string().min(1).max(64);
const obj = z.record(z.string().max(64), z.unknown());

async function run<T>(
  schema: z.ZodType<T>,
  input: unknown,
  fn: (tx: Tx, userId: string, data: T) => Promise<void>,
): Promise<SaveResult> {
  const user = await getCurrentUser();
  if (!user)
    return { ok: false, error: "Tu sesión expiró. Vuelve a ingresar." };
  if (JSON.stringify(input ?? null).length > MAX_JSON)
    return { ok: false, error: "Los datos son demasiado grandes." };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Datos no válidos." };
  try {
    await withUser(user.id, (tx) => fn(tx, user.id, parsed.data));
    return { ok: true };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    console.error("[copiloto]", e);
    return { ok: false, error: "No pudimos guardar. Inténtalo de nuevo." };
  }
}

const settingsPatch = z
  .object({
    risk: z.number().int().min(1).max(10),
    cur: z.enum(["COP", "USD"]),
    trm: z.number().finite().positive().max(100000),
    active: id,
    marca: z.string().max(120),
    tab: z.string().max(20),
    ptab: z.string().max(20),
    pf: obj,
    checks: z.record(z.string().max(16), z.boolean()),
    testForm: obj,
    planForm: obj,
    simForm: obj,
  })
  .partial()
  .strict();

export async function saveSettingsAction(patch: SettingsPatch) {
  return run(settingsPatch, patch, (tx, u, d) =>
    saveSettings(tx, u, d as SettingsPatch),
  );
}

export async function putProductAction(p: Product) {
  return run(productSchema, p, (tx, u, d) => putProduct(tx, u, d as Product));
}

export async function removeProductAction(productId: string) {
  return run(id, productId, (tx, u, d) => removeProduct(tx, u, d));
}

export async function putTestAction(t: Test) {
  return run(testSchema, t, (tx, u, d) => putTest(tx, u, d as unknown as Test));
}

export async function removeTestAction(testId: string) {
  return run(id, testId, (tx, u, d) => removeTest(tx, u, d));
}

export async function putProductStateAction(
  productId: string,
  kind: "pc" | "mk",
  data: Record<string, unknown> | null,
) {
  return run(
    z.object({
      productId: id,
      kind: z.enum(["pc", "mk"]),
      data: obj.nullable(),
    }),
    { productId, kind, data },
    (tx, u, d) => putProductState(tx, u, d.productId, d.kind, d.data),
  );
}

export async function putSavedAction(kind: "plan" | "sim", item: Saved) {
  return run(
    z.object({ kind: z.enum(["plan", "sim"]), item: savedSchema }),
    { kind, item },
    (tx, u, d) => putSaved(tx, u, d.kind, d.item as unknown as Saved),
  );
}

export async function removeSavedAction(savedId: string) {
  return run(id, savedId, (tx, u, d) => removeSaved(tx, u, d));
}
