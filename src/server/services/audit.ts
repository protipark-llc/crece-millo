import type { Tx } from "@/lib/db/client";
import { auditLog } from "@/lib/db/schema";

/** Registro de cambios financieros relevantes (creación, edición, eliminación). */
export async function audit(tx: Tx, userId: string, entity: string, entityId: string, action: string, data?: unknown) {
  await tx.insert(auditLog).values({ userId, entity, entityId, action, data: data ?? null });
}
