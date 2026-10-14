import { and, eq, sql } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { copilotoMentorUso } from "@/lib/db/schema";

/** Usos del mentor de hoy. */
export async function mentorUsos(
  tx: Tx,
  userId: string,
  dia: string,
): Promise<number> {
  const [r] = await tx
    .select({ usos: copilotoMentorUso.usos })
    .from(copilotoMentorUso)
    .where(
      and(eq(copilotoMentorUso.userId, userId), eq(copilotoMentorUso.dia, dia)),
    );
  return r?.usos ?? 0;
}

/** Suma un uso (solo cuando el mentor respondió). */
export async function sumarUsoMentor(
  tx: Tx,
  userId: string,
  dia: string,
): Promise<number> {
  const [r] = await tx
    .insert(copilotoMentorUso)
    .values({ userId, dia, usos: 1 })
    .onConflictDoUpdate({
      target: [copilotoMentorUso.userId, copilotoMentorUso.dia],
      set: { usos: sql`${copilotoMentorUso.usos} + 1` },
    })
    .returning({ usos: copilotoMentorUso.usos });
  return r!.usos;
}
