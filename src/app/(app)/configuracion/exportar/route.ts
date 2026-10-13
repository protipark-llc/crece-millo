import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { withUser } from "@/lib/db/client";
import * as s from "@/lib/db/schema";
import { getCurrentUser } from "@/server/session";

/**
 * Exportación de datos personales (portabilidad). Incluye todas las tablas de la persona.
 * Los importes están en unidades menores (centavos) junto con su moneda.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const data = await withUser(user.id, async (tx) => {
    return {
      exportedAt: new Date().toISOString(),
      note: "Importes en unidades menores de su moneda (p. ej. centavos).",
      user: { id: user.id, name: user.name, email: user.email },
      settings: await tx.select().from(s.userSettings).where(eq(s.userSettings.userId, user.id)),
      accounts: await tx.select().from(s.accounts).where(eq(s.accounts.userId, user.id)),
      categories: await tx.select().from(s.categories).where(eq(s.categories.userId, user.id)),
      transactions: await tx.select().from(s.transactions).where(eq(s.transactions.userId, user.id)),
      recurrenceRules: await tx.select().from(s.recurrenceRules).where(eq(s.recurrenceRules.userId, user.id)),
      budgets: await tx.select().from(s.budgets).where(eq(s.budgets.userId, user.id)),
      budgetLines: await tx.select().from(s.budgetLines).where(eq(s.budgetLines.userId, user.id)),
      debts: await tx.select().from(s.debts).where(eq(s.debts.userId, user.id)),
      debtPayments: await tx.select().from(s.debtPayments).where(eq(s.debtPayments.userId, user.id)),
      assets: await tx.select().from(s.assets).where(eq(s.assets.userId, user.id)),
      assetValuations: await tx.select().from(s.assetValuations).where(eq(s.assetValuations.userId, user.id)),
      goals: await tx.select().from(s.goals).where(eq(s.goals.userId, user.id)),
      goalContributions: await tx.select().from(s.goalContributions).where(eq(s.goalContributions.userId, user.id)),
      exchangeRates: await tx.select().from(s.exchangeRates).where(eq(s.exchangeRates.userId, user.id)),
      scenarios: await tx.select().from(s.scenarios).where(eq(s.scenarios.userId, user.id)),
      courseEnrollments: await tx.select().from(s.courseEnrollments).where(eq(s.courseEnrollments.userId, user.id)),
      lessonProgress: await tx.select().from(s.lessonProgress).where(eq(s.lessonProgress.userId, user.id)),
      auditLog: await tx.select().from(s.auditLog).where(eq(s.auditLog.userId, user.id)),
      copiloto: {
        settings: await tx.select().from(s.copilotoSettings).where(eq(s.copilotoSettings.userId, user.id)),
        products: await tx.select().from(s.copilotoProducts).where(eq(s.copilotoProducts.userId, user.id)),
        tests: await tx.select().from(s.copilotoTests).where(eq(s.copilotoTests.userId, user.id)),
        productState: await tx.select().from(s.copilotoProductState).where(eq(s.copilotoProductState.userId, user.id)),
        saved: await tx.select().from(s.copilotoSaved).where(eq(s.copilotoSaved.userId, user.id)),
        anterior: {
          products: await tx.select().from(s.copilotProducts).where(eq(s.copilotProducts.userId, user.id)),
          tests: await tx.select().from(s.copilotTests).where(eq(s.copilotTests.userId, user.id)),
          plans: await tx.select().from(s.copilotPlans).where(eq(s.copilotPlans.userId, user.id)),
          routeProgress: await tx.select().from(s.dropshipProgress).where(eq(s.dropshipProgress.userId, user.id)),
        },
      },
    };
  });
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="crece-datos-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
