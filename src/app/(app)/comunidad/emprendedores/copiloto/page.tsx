import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { loadForUser } from "@/server/action-utils";
import { copilotoSettings } from "@/lib/db/schema";
import { copilotoHref, tabByCode } from "@/lib/copiloto/nav";

/** Abre la última sección usada, como el original (go(S.tab || "ruta")). */
export default async function CopilotoIndex() {
  const tab = await loadForUser(async ({ tx, userId }) => {
    const [s] = await tx.select({ tab: copilotoSettings.tab }).from(copilotoSettings).where(eq(copilotoSettings.userId, userId));
    return s?.tab ?? "ruta";
  });
  redirect(copilotoHref(tabByCode(tab).slug));
}
