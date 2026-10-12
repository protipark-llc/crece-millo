"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/action-utils";
import { addRate, setDiagnosticStep, updateSettings } from "@/server/services/settings";
import { currency, isoDate, settingsInput } from "@/server/validation";
import { getCurrentUser, destroySession } from "@/server/session";
import { deleteUserAndData } from "@/server/services/users";
import { UserFacingError } from "@/server/services/errors";
import { COUNTRIES } from "@/lib/money/currency";

export async function updateSettingsAction(_: ActionState, fd: FormData) {
  return runAction(settingsInput.extend({ markProfile: z.string().optional() }), fd, async ({ tx, userId, input }) => {
    const { markProfile, ...rest } = input;
    if (!COUNTRIES.some((c) => c.code === rest.country)) throw new UserFacingError("País no soportado.", "country");
    try {
      new Intl.DateTimeFormat(rest.locale, { timeZone: rest.timezone });
    } catch {
      throw new UserFacingError("Configuración regional o zona horaria inválida.", "timezone");
    }
    await updateSettings(tx, userId, rest);
    if (markProfile) await setDiagnosticStep(tx, userId, "profile", true);
    revalidatePath("/", "layout");
    return { message: "Preferencias guardadas." };
  });
}

export async function addRateAction(_: ActionState, fd: FormData) {
  return runAction(
    z.object({ from: currency, to: currency, rate: z.string().trim().min(1), asOf: isoDate, source: z.string().trim().min(2, "Indica la fuente (p. ej. TRM Banco de la República)").max(120) }),
    fd,
    async ({ tx, userId, input }) => {
      const rate = Number(input.rate.replace(/\./g, "").replace(",", ".")) || Number(input.rate);
      if (!Number.isFinite(rate) || rate <= 0) throw new UserFacingError("La tasa debe ser un número positivo.", "rate");
      if (input.from === input.to) throw new UserFacingError("Las monedas deben ser distintas.", "to");
      await addRate(tx, userId, { from: input.from, to: input.to, rate, asOf: input.asOf, source: input.source });
      revalidatePath("/", "layout");
      return { message: "Tasa registrada." };
    },
  );
}

export async function deleteAccountDataAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sesión no válida." };
  const password = String(fd.get("password") ?? "");
  try {
    await deleteUserAndData(user.id, password);
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    console.error("[delete-account]", e);
    return { ok: false, error: "No pudimos eliminar la cuenta." };
  }
  await destroySession();
  redirect("/");
}
