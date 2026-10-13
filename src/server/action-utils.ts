import "server-only";
import { z } from "zod";
import { withUser, type Tx } from "@/lib/db/client";
import { getCurrentUser } from "./session";
import { INFRASTRUCTURE_MESSAGE, isInfrastructureError, translateDbError, UserFacingError } from "./services/errors";
import { formToObject, zodFieldErrors, type FieldErrors } from "./validation";
import { todayIn } from "@/lib/finance/dates";
import { getSettings } from "./services/settings";

export interface ActionState {
  ok: boolean;
  message?: string;
  error?: string;
  fieldErrors?: FieldErrors;
  /** Para avisos no bloqueantes (p. ej. posibles duplicados). */
  warning?: string;
  /** Incrementa en cada éxito: permite a los formularios reiniciarse. */
  nonce?: number;
  redirectTo?: string;
}

export const initialActionState: ActionState = { ok: false };

/**
 * Envoltorio común de las Server Actions:
 * 1) exige sesión; 2) valida con Zod; 3) ejecuta dentro de withUser (RLS + transacción);
 * 4) traduce errores a mensajes seguros (sin filtrar detalles internos).
 */
export async function runAction<S extends z.ZodTypeAny>(
  schema: S,
  formData: FormData,
  fn: (ctx: { tx: Tx; userId: string; input: z.infer<S>; today: string }) => Promise<Partial<ActionState> | void>,
): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Tu sesión expiró. Vuelve a ingresar." };
  const parsed = schema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, error: "Revisa los campos marcados.", fieldErrors: zodFieldErrors(parsed.error) };
  }
  try {
    const result = await withUser(user.id, async (tx) => {
      const settings = await getSettings(tx, user.id);
      return fn({ tx, userId: user.id, input: parsed.data, today: todayIn(settings.timezone) });
    });
    return { ok: true, nonce: Date.now(), ...(result ?? {}) };
  } catch (err) {
    if (err instanceof UserFacingError) {
      return { ok: false, error: err.message, fieldErrors: err.field ? { [err.field]: err.message } : undefined };
    }
    const translated = translateDbError(err);
    if (translated) return { ok: false, error: translated.message };
    console.error("[action]", err);
    return { ok: false, error: isInfrastructureError(err) ? INFRASTRUCTURE_MESSAGE : "No pudimos completar la operación. Inténtalo de nuevo." };
  }
}

/** Carga datos de página con la sesión y RLS activos. */
export async function loadForUser<T>(fn: (ctx: { tx: Tx; userId: string; today: string }) => Promise<T>): Promise<T> {
  const user = await getCurrentUser();
  if (!user) throw new UserFacingError("Sesión no válida");
  return withUser(user.id, async (tx) => {
    const settings = await getSettings(tx, user.id);
    return fn({ tx, userId: user.id, today: todayIn(settings.timezone) });
  });
}
