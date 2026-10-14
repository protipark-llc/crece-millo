"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/server/session";
import { EJEMPLO_COOKIE } from "@/lib/copiloto/ejemplo";

/** Modo ejemplo: el Co-Piloto muestra la demostración del paquete y nada se guarda. */
export async function setEjemploAction(on: boolean) {
  if (!(await getCurrentUser())) return;
  const jar = await cookies();
  if (on)
    jar.set(EJEMPLO_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/comunidad/emprendedores",
      maxAge: 60 * 60 * 6,
    });
  else jar.delete({ name: EJEMPLO_COOKIE, path: "/comunidad/emprendedores" });
  revalidatePath("/comunidad/emprendedores", "layout");
}
