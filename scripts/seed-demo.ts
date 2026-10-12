/**
 * Crea un usuario de demostración con datos FICTICIOS para probar la aplicación.
 *   npm run db:seed-demo            → demo@crece.test / Demo-clave-2026
 * Si el usuario ya existe, lo elimina y lo vuelve a crear (solo ese usuario).
 */
import { eq } from "drizzle-orm";
import { closeDb, getDb, withUser } from "../src/lib/db/client";
import { users } from "../src/lib/db/schema";
import { addDays, addMonthsClamped, monthStart, todayIn } from "../src/lib/finance/dates";
import { registerUser } from "../src/server/services/users";
import { createAccount } from "../src/server/services/accounts";
import { listCategories } from "../src/server/services/categories";
import { createTransaction } from "../src/server/services/transactions";
import { createBudget, upsertBudgetLine } from "../src/server/services/budgets";
import { addContribution, createAsset, createDebt, createGoal, recordDebtPayment } from "../src/server/services/planning";
import { updateSettings, setDiagnosticStep } from "../src/server/services/settings";
import { accountInput, assetInput, contributionInput, debtInput, debtPaymentInput, goalInput, transactionInput } from "../src/server/validation";

const EMAIL = process.env.DEMO_EMAIL ?? "demo@crece.test";
const PASSWORD = process.env.DEMO_PASSWORD ?? "Demo-clave-2026";

async function main() {
  const db = getDb();
  await db.delete(users).where(eq(users.email, EMAIL));
  const user = await registerUser({ name: "Usuario Demo", email: EMAIL, password: PASSWORD, country: "CO" });
  const today = todayIn("America/Bogota");
  const start = addMonthsClamped(monthStart(today), -3, 1);
  await withUser(user.id, async (tx) => {
    await updateSettings(tx, user.id, {
      country: "CO", currency: "COP", locale: "es-CO", timezone: "America/Bogota",
      incomeStability: "stable", dependentsCount: 1, dependentsNotes: null, singleIncomeHousehold: true,
      emergencyMonthsTarget: null, businessExpensesEnabled: false,
    });
    const cats = await listCategories(tx, user.id);
    const cat = (n: string) => cats.find((c) => c.name === n)!.id;
    const nomina = await createAccount(tx, user.id, accountInput.parse({ name: "Cuenta nómina", type: "savings", currency: "COP", openingBalance: "1.500.000", openedOn: start }));
    const billetera = await createAccount(tx, user.id, accountInput.parse({ name: "Billetera digital", type: "digital_wallet", currency: "COP", openingBalance: "150.000", openedOn: start }));
    const ahorro = await createAccount(tx, user.id, accountInput.parse({ name: "Ahorro programado", type: "savings", currency: "COP", openingBalance: "2.000.000", openedOn: start }));
    await createAccount(tx, user.id, accountInput.parse({ name: "Fondo de inversión", type: "investment", currency: "COP", openingBalance: "3.000.000", openedOn: start }));
    const tx_ = (o: Record<string, string>) => createTransaction(tx, user.id, transactionInput.parse({ kind: "expense", status: "posted", ...o }), today);
    // Recurrencias desde el inicio: la primera ocurrencia queda registrada; las siguientes se confirman abajo.
    const salary = await tx_({ kind: "income", amount: "2.600.000", accountId: nomina.id, categoryId: cat("Salario"), incomeSource: "salary", description: "Salario quincena", date: addDays(start, 14), frequency: "semimonthly" });
    const rent = await tx_({ amount: "1.600.000", accountId: nomina.id, categoryId: cat("Arriendo o hipoteca"), description: "Arriendo", date: addDays(start, 4), frequency: "monthly" });
    const internet = await tx_({ amount: "95.000", accountId: nomina.id, categoryId: cat("Internet y TV"), description: "Internet hogar", date: addDays(start, 9), frequency: "monthly" });
    const streaming = await tx_({ amount: "45.000", accountId: billetera.id, categoryId: cat("Streaming y música"), description: "Plataformas de streaming", date: addDays(start, 11), frequency: "monthly" });
    const gym = await tx_({ amount: "110.000", accountId: nomina.id, categoryId: cat("Gimnasio y deporte"), description: "Gimnasio", date: addDays(start, 2), frequency: "monthly" });
    const { confirmOccurrence } = await import("../src/server/services/transactions");
    const { occurrences } = await import("../src/lib/finance/recurrence");
    const { listRules } = await import("../src/server/services/transactions");
    const rules = await listRules(tx, user.id);
    for (const r of rules) {
      for (const d of occurrences(r, addDays(r.startDate, 1), addDays(today, -1))) {
        await confirmOccurrence(tx, user.id, { ruleId: r.id, occurrenceDate: d, action: "post" }, today);
      }
    }
    void salary; void rent; void internet; void streaming; void gym;
    // Gastos variables por mes
    for (let i = 0; i <= 3; i++) {
      const m = addMonthsClamped(start, i, 1);
      const day = (n: number) => { const d = addDays(m, n); return d <= today ? d : null; };
      const items: [number, string, string, string, string][] = [
        [3, "Mercado del mes", "620.000", "Mercado", nomina.id],
        [8, "Servicios de energía y agua", "185.000", "Energía", nomina.id],
        [12, "Restaurante fin de semana", "140.000", "Restaurantes y domicilios", billetera.id],
        [16, "Transporte público", "160.000", "Transporte público", billetera.id],
        [19, "Alimento de mascota", "85.000", "Alimento de mascotas", billetera.id],
        [22, "Mercado de reposición", "210.000", "Mercado", nomina.id],
      ];
      for (const [d, desc, amount, c, acc] of items) {
        const date = day(d);
        if (date) await tx_({ amount, accountId: acc, categoryId: cat(c), description: desc, date });
      }
      const t = day(15);
      if (t) await tx_({ kind: "transfer", amount: "300.000", accountId: nomina.id, toAccountId: ahorro.id, description: "Ahorro del mes", date: t });
    }
    await tx_({ amount: "480.000", accountId: nomina.id, categoryId: cat("Impuestos y seguros del vehículo"), description: "SOAT (previsto)", status: "planned", date: addDays(today, 20) });
    // Deudas
    const card = await createDebt(tx, user.id, debtInput.parse({ name: "Tarjeta de crédito", creditor: "Banco ficticio", type: "credit_card", currency: "COP", openingBalance: "4.200.000", balanceDate: start, ratePercent: "28", rateBasis: "EA", minimumPayment: "320.000", paymentDay: "20" }));
    await createDebt(tx, user.id, debtInput.parse({ name: "Crédito educativo", creditor: "Entidad de crédito educativo", type: "student_loan", currency: "COP", openingBalance: "7.200.000", balanceDate: start, ratePercent: "12", rateBasis: "EA", minimumPayment: "250.000", paymentDay: "5" }));
    await createDebt(tx, user.id, debtInput.parse({ name: "Préstamo familiar", type: "family", currency: "COP", openingBalance: "1.500.000", balanceDate: start, minimumPayment: "150.000" }));
    for (let i = 0; i < 3; i++) {
      const d = addDays(addMonthsClamped(start, i, 1), 19);
      if (d <= today) await recordDebtPayment(tx, user.id, debtPaymentInput.parse({ debtId: card.id, accountId: nomina.id, amount: "320.000", paidOn: d }), today);
    }
    // Activos
    const car = await createAsset(tx, user.id, assetInput.parse({ name: "Vehículo", type: "vehicle", currency: "COP", liquidity: "illiquid", value: "38.000.000", valuedOn: start, source: "Estimación de mercado (ficticia)" }));
    await createDebt(tx, user.id, debtInput.parse({ name: "Crédito del vehículo", type: "vehicle", currency: "COP", openingBalance: "41.000.000", balanceDate: start, ratePercent: "18", rateBasis: "EA", minimumPayment: "1.150.000", securedAssetId: car.id }));
    await createAsset(tx, user.id, assetInput.parse({ name: "Cesantías", type: "retirement", currency: "COP", liquidity: "illiquid", value: "4.800.000", valuedOn: start, source: "Extracto del fondo" }));
    // Objetivos
    const fund = await createGoal(tx, user.id, goalInput.parse({ name: "Fondo de emergencia", type: "emergency_fund", currency: "COP", targetAmount: "12.000.000", targetDate: addMonthsClamped(today, 18), priority: "1", plannedMonthly: "300.000", accountId: ahorro.id, emergencyMonthsTarget: "5", initialAmount: "2.000.000" }), today, null);
    await addContribution(tx, user.id, contributionInput.parse({ goalId: fund.id, amount: "600.000", direction: "in", contributedOn: today }), today);
    await createGoal(tx, user.id, goalInput.parse({ name: "Viaje en familia", type: "travel", currency: "COP", targetAmount: "5.000.000", targetDate: addMonthsClamped(today, 10), priority: "3", plannedMonthly: "250.000" }), today, null);
    // Presupuesto del mes
    const b = await createBudget(tx, user.id, { month: monthStart(today), currency: "COP", copyFromMonth: null, expectedIncome: "5.200.000", savingsTarget: "300.000" });
    const lines: [string, string | null, string | null][] = [
      ["Arriendo o hipoteca", "1.600.000", null], ["Mercado", "750.000", null], ["Energía", "200.000", null], ["Internet y TV", "95.000", null],
      ["Transporte público", "180.000", null], ["Restaurantes y domicilios", "120.000", null], ["Deudas", "1.870.000", null],
      ["Impuestos y seguros del vehículo", null, "1.300.000"], ["Streaming y música", "45.000", null], ["Alimento de mascotas", "90.000", null], ["Gimnasio y deporte", "110.000", null],
    ];
    for (const [c, planned, annual] of lines) await upsertBudgetLine(tx, user.id, { budgetId: b.id, categoryId: cat(c), planned, annual });
    for (const s of ["profile", "accounts", "income", "expenses", "debts", "goals"] as const) await setDiagnosticStep(tx, user.id, s, true);
  });
  console.log(`Usuario demo listo: ${EMAIL} / ${PASSWORD}`);
  await closeDb();
}

main().catch(async (e) => {
  console.error(e);
  await closeDb();
  process.exit(1);
});
