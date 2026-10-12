"use server";

import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/server/session";
import { authenticate, registerUser } from "@/server/services/users";
import { UserFacingError } from "@/server/services/errors";
import { formToObject, loginInput, registerInput, zodFieldErrors } from "@/server/validation";
import type { ActionState } from "@/server/action-utils";

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = registerInput.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: zodFieldErrors(parsed.error) };
  try {
    const country = String(fd.get("country") ?? "CO");
    const user = await registerUser({ ...parsed.data, country });
    await createSession(user.id);
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message, fieldErrors: e.field ? { [e.field]: e.message } : undefined };
    console.error("[register]", e);
    return { ok: false, error: "No pudimos crear tu cuenta. Inténtalo de nuevo." };
  }
  redirect("/universidad/finanzas/diagnostico");
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = loginInput.safeParse(formToObject(fd));
  if (!parsed.success) return { ok: false, error: "Revisa los campos marcados.", fieldErrors: zodFieldErrors(parsed.error) };
  try {
    const user = await authenticate(parsed.data.email, parsed.data.password);
    await createSession(user.id);
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    console.error("[login]", e);
    return { ok: false, error: "No pudimos iniciar tu sesión. Inténtalo de nuevo." };
  }
  redirect("/universidad");
}

export async function logoutAction() {
  await destroySession();
  redirect("/ingresar");
}
