import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { sessions, users } from "@/lib/db/schema";

export const SESSION_COOKIE = "cm_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const db = getDb();
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  // Limpieza oportunista de sesiones vencidas de esta persona.
  await db.delete(sessions).where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE === "true",
    path: "/",
    expires: expiresAt,
  });
}

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
}

/** Usuario autenticado de la petición actual (memorizado por petición). */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const db = getDb();
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, sessionId: sessions.id, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, hashToken(token)), gt(sessions.expiresAt, new Date())));
  if (!row) return null;
  if (row.expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * 86_400_000) {
    await db
      .update(sessions)
      .set({ expiresAt: new Date(Date.now() + SESSION_DAYS * 86_400_000) })
      .where(eq(sessions.id, row.sessionId));
  }
  return { id: row.id, name: row.name, email: row.email };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/ingresar");
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(SESSION_COOKIE);
}
