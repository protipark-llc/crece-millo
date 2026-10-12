import { and, desc, eq } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { scenarios } from "@/lib/db/schema";
import { NotFoundError } from "./errors";

/** Los escenarios guardan solo supuestos: nunca se aplican a movimientos reales. */
export async function listScenarios(tx: Tx, userId: string) {
  return tx.select().from(scenarios).where(eq(scenarios.userId, userId)).orderBy(desc(scenarios.updatedAt));
}

export async function saveScenario(tx: Tx, userId: string, name: string, assumptions: unknown) {
  const [row] = await tx.insert(scenarios).values({ userId, name, assumptions }).returning();
  return row!;
}

export async function deleteScenario(tx: Tx, userId: string, id: string) {
  const res = await tx.delete(scenarios).where(and(eq(scenarios.id, id), eq(scenarios.userId, userId))).returning({ id: scenarios.id });
  if (!res.length) throw new NotFoundError("El escenario");
}
