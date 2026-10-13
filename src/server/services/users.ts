import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { loginAttempts, sessions, userSettings, users } from "@/lib/db/schema";
import { COUNTRIES } from "@/lib/money/currency";
import { hashPassword, verifyPassword } from "../password";
import { seedDefaultCategories } from "./categories";
import { UserFacingError } from "./errors";

export async function registerUser(input: { name: string; email: string; password: string; country?: string }) {
  const db = getDb();
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, input.email));
  if (existing.length > 0) throw new UserFacingError("Ya existe una cuenta con ese correo.", "email");
  const passwordHash = await hashPassword(input.password);
  const country = COUNTRIES.find((c) => c.code === (input.country ?? "CO")) ?? COUNTRIES[0]!;
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({ name: input.name, email: input.email, passwordHash }).returning();
    await tx.execute(sql`select set_config('app.user_id', ${user!.id}, true)`);
    await tx.insert(userSettings).values({
      userId: user!.id,
      country: country.code,
      currency: country.currency,
      locale: country.locale,
      timezone: country.timezone,
    });
    await seedDefaultCategories(tx, user!.id);
    return user!;
  });
}

const WINDOW_MINUTES = 15;
const MAX_FAILURES = 5;

/** Verifica credenciales con límite de intentos fallidos por correo. Mensaje genérico para no revelar si el correo existe. */
export async function authenticate(email: string, password: string) {
  const db = getDb();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const [{ failures } = { failures: 0 }] = await db
    .select({ failures: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), eq(loginAttempts.success, false), gt(loginAttempts.createdAt, since)));
  if (failures >= MAX_FAILURES) {
    throw new UserFacingError(`Demasiados intentos fallidos. Espera ${WINDOW_MINUTES} minutos e inténtalo de nuevo.`);
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  // Se verifica un hash ficticio si el usuario no existe para igualar tiempos de respuesta.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : (await verifyPassword(password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA"), false);
  await db.insert(loginAttempts).values({ email, success: ok });
  if (!user || !ok) throw new UserFacingError("Correo o contraseña incorrectos.");
  return user;
}

export async function deleteUserAndData(userId: string, password: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new UserFacingError("La contraseña no es correcta.", "password");
  }
  // ON DELETE CASCADE elimina sesiones, preferencias y todos los datos financieros.
  await db.delete(users).where(eq(users.id, userId));
}

/**
 * Cambia la contraseña verificando la actual. Cierra todas las sesiones de la persona;
 * quien llama debe crear una sesión nueva para el dispositivo actual.
 */
export async function changePassword(userId: string, current: string, next: string) {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    throw new UserFacingError("La contraseña actual no es correcta.", "currentPassword");
  }
  if (current === next) throw new UserFacingError("La nueva contraseña debe ser distinta de la actual.", "newPassword");
  const passwordHash = await hashPassword(next);
  await db.transaction(async (tx) => {
    await tx.update(users).set({ passwordHash }).where(eq(users.id, userId));
    await tx.delete(sessions).where(eq(sessions.userId, userId));
  });
}

/**
 * Crea una cuenta inicial si no existe (usado por scripts/bootstrap-user.ts al desplegar).
 * No aplica la regla de longitud del registro: es una vía administrativa y la contraseña
 * debe cambiarse en Configuración después del primer ingreso. Si la cuenta ya existe, no
 * modifica nada (no se reescribe la contraseña en cada despliegue).
 */
export async function ensureBootstrapUser(input: { email: string; name: string; password: string; country?: string }) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Correo de la cuenta inicial inválido");
  if (input.password.length < 6) throw new Error("La contraseña inicial debe tener al menos 6 caracteres");
  const db = getDb();
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) return { created: false as const, id: existing.id };
  const user = await registerUser({ name: input.name, email, password: input.password, country: input.country });
  return { created: true as const, id: user.id };
}
