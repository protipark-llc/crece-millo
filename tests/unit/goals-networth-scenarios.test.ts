import { describe, expect, it } from "vitest";
import { coverageMonths, goalProgress, requiredMonthlyContribution, suggestedEmergencyMonths } from "@/lib/finance/goals";
import { assetEquity, netWorthAt, netWorthSeries, type EngineAsset, type EngineDebt } from "@/lib/finance/networth";
import { DEFAULT_ASSUMPTIONS, runScenario, runVariants, scenarioDrivers, type ScenarioBaseline } from "@/lib/finance/scenarios";
import { computeIndicators } from "@/lib/finance/indicators";
import { buildInsights } from "@/lib/finance/insights";
import { monthlyRate } from "@/lib/finance/debt";
import type { EngineAccount } from "@/lib/finance/types";

const COP = (p: number) => p * 100;

describe("objetivos", () => {
  it("aporte mensual requerido", () => {
    expect(requiredMonthlyContribution(COP(12_000_000), COP(0), 12)).toBe(COP(1_000_000));
    expect(requiredMonthlyContribution(COP(12_000_000), COP(12_000_000), 12)).toBe(0);
    expect(requiredMonthlyContribution(100, 0, 0)).toBeNull();
    // Con rendimiento supuesto el aporte es menor
    expect(requiredMonthlyContribution(COP(12_000_000), 0, 12, 0.01)!).toBeLessThan(COP(1_000_000));
  });
  it("progreso y si va al día", () => {
    const g = goalProgress({ target: COP(6_000_000), accumulated: COP(1_500_000), targetDate: "2027-04-12", today: "2026-10-12", plannedMonthly: COP(500_000) });
    expect(g.monthsLeft).toBe(6);
    expect(g.requiredMonthly).toBe(COP(750_000));
    expect(g.onTrack).toBe(false);
    expect(g.progressPct).toBe(0.25);
    expect(g.monthsAtPlannedPace).toBe(9);
  });
  it("fondo de emergencia: sugerencia explicada y cobertura", () => {
    const s = suggestedEmergencyMonths({ stability: "variable", dependents: 1, singleIncome: true });
    expect(s.months).toBe(8);
    expect(s.reasons.length).toBe(4);
    expect(coverageMonths(COP(6_000_000), COP(2_000_000))).toBe(3);
    expect(coverageMonths(COP(6_000_000), 0)).toBeNull();
  });
});

describe("patrimonio neto (ejemplo del libro)", () => {
  const acc: EngineAccount = { id: "c1", name: "Cuenta 1", type: "savings", currency: "USD", openingBalance: 200_000, openedOn: "2026-01-01", isLiquid: true };
  const assets: EngineAsset[] = [
    { id: "house", name: "Inmueble 1", type: "real_estate", currency: "USD", liquidity: "illiquid", valuations: [{ value: 8_000_000, valuedOn: "2026-01-01", source: "avalúo" }] },
    { id: "car", name: "Automóvil 1", type: "vehicle", currency: "USD", liquidity: "illiquid", valuations: [{ value: 1_500_000, valuedOn: "2026-01-01", source: "estimación" }] },
  ];
  const debts: EngineDebt[] = [
    { id: "mort", name: "Hipoteca", currency: "USD", openingBalance: 3_000_000, balanceDate: "2026-01-01", securedAssetId: "house", payments: [] },
    { id: "carloan", name: "Crédito carro", currency: "USD", openingBalance: 1_800_000, balanceDate: "2026-01-01", securedAssetId: "car", payments: [{ date: "2026-02-15", principal: 100_000 }] },
  ];
  it("activos − pasivos y liquidez separada", () => {
    const nw = netWorthAt("2026-01-31", { accounts: [acc], txs: [], assets, debts }, "USD");
    expect(nw.assets).toBe(9_700_000);
    expect(nw.liabilities).toBe(4_800_000);
    expect(nw.netWorth).toBe(4_900_000);
    expect(nw.liquid).toBe(200_000);
    expect(nw.illiquid).toBe(9_500_000);
  });
  it("valor neto por activo: el carro puede tener patrimonio negativo", () => {
    const eq = assetEquity(assets, debts, "2026-01-31");
    expect(eq.find((e) => e.assetId === "house")!.equity).toBe(5_000_000);
    expect(eq.find((e) => e.assetId === "car")!.equity).toBe(-300_000); // -$3.000 como en el libro
  });
  it("serie histórica refleja abonos a capital", () => {
    const s = netWorthSeries("2026-03-15", 3, { accounts: [acc], txs: [], assets, debts }, "USD");
    expect(s.map((x) => x.netWorth)).toEqual([4_900_000, 5_000_000, 5_000_000]);
  });
});

describe("simulador de escenarios", () => {
  const base: ScenarioBaseline = {
    startDate: "2026-10-12",
    liquidBalance: COP(1_000_000),
    monthlyIncome: COP(3_000_000),
    monthlyEssential: COP(1_800_000),
    monthlyDiscretionary: COP(400_000),
    otherAssets: COP(10_000_000),
    debts: [{ id: "d", name: "Tarjeta", balance: COP(2_000_000), monthlyRate: monthlyRate(28, "EA"), minimumPayment: COP(200_000), monthlyFees: 0 }],
  };
  it("congela la línea base: no muta los datos de entrada", () => {
    const snapshot = JSON.stringify(base);
    runVariants(base, { ...DEFAULT_ASSUMPTIONS, incomeChangePct: 10, oneOffPurchase: { amount: COP(5_000_000), month: 2 } });
    expect(JSON.stringify(base)).toBe(snapshot);
  });
  it("una caída de ingresos produce déficit y caja negativa", () => {
    const r = runScenario(base, { ...DEFAULT_ASSUMPTIONS, incomeLoss: { amount: COP(3_000_000), startMonth: 1, months: 3 } });
    expect(r.firstNegativeMonth).toBe(1);
    expect(r.months[3]!.income).toBe(COP(3_000_000));
  });
  it("favorable ≥ base ≥ desfavorable y los conductores se ordenan por impacto", () => {
    const v = runVariants(base, { ...DEFAULT_ASSUMPTIONS, horizonMonths: 24 });
    expect(v.favorable.finalCash).toBeGreaterThan(v.base.finalCash);
    expect(v.base.finalCash).toBeGreaterThan(v.unfavorable.finalCash);
    const d = scenarioDrivers(base, { ...DEFAULT_ASSUMPTIONS, expenseChangePct: 15, oneOffPurchase: { amount: COP(200_000), month: 1 } });
    expect(d[0]!.key).toBe("expense");
    expect(d[0]!.impactOnCash).toBeLessThan(0);
  });
  it("el patrimonio = caja + otros activos − deudas", () => {
    const r = runScenario(base, DEFAULT_ASSUMPTIONS);
    const m = r.months[0]!;
    expect(m.netWorth).toBe(m.cash + COP(10_000_000) - m.debt);
  });
});

describe("indicadores y recomendaciones", () => {
  it("no divide por cero: tasa de ahorro sin ingresos queda en datos insuficientes", () => {
    const ind = computeIndicators({
      periodLabel: "Mes",
      income: 0,
      expenses: 100,
      essential: 0,
      discretionary: 0,
      unclassified: 100,
      budgetPlanned: null,
      budgetExecuted: null,
      cashBalance: 0,
      hasAccounts: false,
      monthlyDebtPayments: null,
      totalDebt: 0,
      monthlyNetIncomeReference: null,
      emergencyFund: null,
      essentialMonthlyReference: null,
      netWorth: null,
      netWorthPrevMonth: null,
      netWorthPrevYear: null,
      goalsAchieved: 0,
      goalsActive: 0,
    });
    const sr = ind.find((i) => i.key === "savings_rate")!;
    expect(sr.value).toBeNull();
    expect(sr.status).toBe("insufficient_data");
    expect(ind.find((i) => i.key === "budget_execution")!.status).toBe("not_applicable");
  });
  it("prioriza alertas críticas e incluye datos, acción e incertidumbre", () => {
    const ins = buildInsights({
      fmt: (m) => String(m),
      fmtPct: (v) => String(v),
      fmtDate: (d) => d,
      hasAccounts: true,
      hasIncome: true,
      hasBudget: false,
      firstNegativeDate: "2026-11-01",
      lowestBalance: -500,
      daysAhead: 90,
      overdueCount: 0,
      overLimitLines: [],
      lastMonth: null,
      emergency: null,
      debts: [{ name: "Tarjeta", ea: 0.3, balance: 1000, daysPastDue: 0, minimumPayment: 100 }],
      avalancheSavings: null,
      debtServiceRatio: null,
      subscriptionsMonthly: 0,
      monthlyIncomeReference: null,
      uncategorizedCount: 0,
    });
    expect(ins[0]!.id).toBe("negative_cash");
    expect(ins[0]!.impact).toMatch(/500/);
    for (const i of ins) {
      expect(i.action.href).toMatch(/^\/universidad\/finanzas/);
      expect(i.explanation.length).toBeGreaterThan(10);
    }
  });
});
