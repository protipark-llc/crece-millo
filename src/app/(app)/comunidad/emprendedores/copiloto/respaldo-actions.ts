"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/action-utils";
import { UserFacingError } from "@/server/services/errors";
import { importState, resetState } from "@/server/services/copiloto";
import { BackupError, parseBackup } from "@/lib/copiloto/state";

const MAX_BYTES = 5 * 1024 * 1024;
const refresh = () => revalidatePath("/comunidad/emprendedores", "layout");

/** «Importar respaldo» (importJSON, L1141): JSON del original (v3 o v4) o de Crece Millo. Reemplaza todo. */
export async function importBackupAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const file = fd.get("archivo");
  return runAction(z.object({}), fd, async ({ tx, userId, today }) => {
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError("Elige el archivo .json de tu respaldo.", "archivo");
    if (file.size > MAX_BYTES) throw new UserFacingError("El archivo pesa más de 5 MB: no parece un respaldo del Co-Piloto.", "archivo");
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      throw new UserFacingError("Archivo no válido: no es un JSON.", "archivo");
    }
    try {
      await importState(tx, userId, parseBackup(raw, today));
    } catch (e) {
      if (e instanceof BackupError) throw new UserFacingError(e.message, "archivo");
      throw e;
    }
    refresh();
    return { message: "Respaldo importado." };
  });
}

/** «Borrar todo» (resetAll, L1145): la confirmación con texto la pide la interfaz. */
export async function resetCopilotoAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(z.object({ confirmacion: z.literal("BORRAR", { message: "Escribe BORRAR para confirmar." }) }), fd, async ({ tx, userId, today }) => {
    await resetState(tx, userId, today);
    refresh();
    return { message: "Listo: el Co-Piloto volvió a empezar con los productos de ejemplo." };
  });
}
