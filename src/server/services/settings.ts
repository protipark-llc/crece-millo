import { normalizeSections, type ViewMode } from "@/lib/sections";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { Tx } from "@/lib/db/client";
import { exchangeRates, userSettings } from "@/lib/db/schema";
import type { settingsInput } from "../validation";
import { audit } from "./audit";

export type Settings = typeof userSettings.$inferSelect;

export const DIAGNOSTIC_STEPS = [
  { key: "profile", label: "País, moneda y hogar" },
  { key: "accounts", label: "Cuentas y saldos" },
  { key: "income", label: "Ingresos" },
  { key: "expenses", label: "Gastos fijos y variables" },
  { key: "annual", label: "Gastos ocasionales y anuales" },
  { key: "debts", label: "Deudas y obligaciones" },
  { key: "assets", label: "Activos y ahorros" },
  { key: "goals", label: "Objetivos" },
] as const;
export type DiagnosticStepKey = (typeof DIAGNOSTIC_STEPS)[number]["key"];

export async function getSettings(tx: Tx, userId: string): Promise<Settings> {
  const [row] = await tx.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (row) return row;
  const [created] = await tx.insert(userSettings).values({ userId }).returning();
  return created!;
}

export async function updateSettings(tx: Tx, userId: string, input: z.infer<typeof settingsInput>) {
  await getSettings(tx, userId);
  await tx.update(userSettings).set(input).where(eq(userSettings.userId, userId));
  await audit(tx, userId, "settings", userId, "update");
}

export async function setDiagnosticStep(tx: Tx, userId: string, step: DiagnosticStepKey, done: boolean) {
  const s = await getSettings(tx, userId);
  const set = new Set(s.diagnosticSteps);
  if (done) set.add(step);
  else set.delete(step);
  await tx.update(userSettings).set({ diagnosticSteps: [...set] }).where(eq(userSettings.userId, userId));
}

/** Guarda la vista (esencial, pro o personalizada) y las secciones elegidas. */
export async function setView(tx: Tx, userId: string, mode: ViewMode, sections: string[] | null) {
  await getSettings(tx, userId);
  await tx
    .update(userSettings)
    .set({ viewMode: mode, sections: mode === "personalizada" ? normalizeSections(sections) : null })
    .where(eq(userSettings.userId, userId));
}

export async function listRates(tx: Tx, userId: string) {
  return tx.select().from(exchangeRates).where(eq(exchangeRates.userId, userId));
}

export async function addRate(tx: Tx, userId: string, input: { from: string; to: string; rate: number; asOf: string; source: string }) {
  await tx
    .insert(exchangeRates)
    .values({ userId, fromCurrency: input.from, toCurrency: input.to, rate: String(input.rate), asOf: input.asOf, source: input.source })
    .onConflictDoUpdate({
      target: [exchangeRates.userId, exchangeRates.fromCurrency, exchangeRates.toCurrency, exchangeRates.asOf],
      set: { rate: String(input.rate), source: input.source },
    });
}
