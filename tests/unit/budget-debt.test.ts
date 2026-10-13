import { describe, expect, it } from "vitest";
import { computeBudget } from "@/lib/finance/budget";
import {
  amortize,
  effectiveAnnual,
  fixedInstallment,
  monthlyRate,
  simulatePayoff,
  splitPayment,
  type DebtForPlan,
} from "@/lib/finance/debt";
import type { EngineCategory, EngineTx } from "@/lib/finance/types";

const COP = (p: number) => p * 100;

const cats: EngineCategory[] = [
  { id: "food", name: "Alimentación", kind: "expense", parentId: null, nature: "essential", behavior: "variable" },
  { id: "market", name: "Mercado", kind: "expense", parentId: "food", nature: "essential", behavior: "variable" },
  { id: "rest", name: "Restaurantes", kind: "expense", parentId: "food", nature: "discretionary", behavior: "variable" },
  { id: "home", name: "Vivienda", kind: "expense", parentId: null, nature: "essential", behavior: "fixed" },
  { id: "fun", name: "Ocio", kind: "expense", parentId: null, nature: "discretionary", behavior: "variable" },
];
let n = 0;
const tx = (o: Partial<EngineTx>): EngineTx => ({
  id: `t${++n}`,
  kind: "expense",
  status: "posted",
  amount: 0,
  currency: "COP",
  accountId: "a",
  date: "2026-05-10",
  postedOn: "2026-05-10",
  ...o,
});

describe("presupuesto vs ejecución", () => {
  const txs = [
    tx({ categoryId: "market", amount: COP(400_000) }),
    tx({ categoryId: "rest", amount: COP(150_000) }), // sin línea propia → cae en Alimentación
    tx({ categoryId: "home", amount: COP(2_000_000) }),
    tx({ categoryId: "fun", amount: COP(50_000) }), // sin línea → sin presupuestar
    tx({ categoryId: "home", amount: COP(100_000), status: "planned", postedOn: null, date: "2026-05-28" }),
    tx({ kind: "income", amount: COP(5_000_000), categoryId: null }),
    tx({ categoryId: "market", amount: COP(999_000), date: "2026-04-30", postedOn: "2026-04-30" }), // otro mes
    tx({ kind: "transfer", amount: COP(1_000_000), toAccountId: "b" }),
  ];
  const s = computeBudget({
    month: "2026-05-01",
    today: "2026-05-31",
    lines: [
      { id: "l1", categoryId: "food", planned: COP(500_000) },
      { id: "l2", categoryId: "market", planned: COP(450_000) },
      { id: "l3", categoryId: "home", planned: COP(2_000_000) },
    ],
    categories: cats,
    txs,
    rules: [],
    baseCurrency: "COP",
    savingsTarget: COP(500_000),
  });
  it("asigna cada gasto a una sola línea, la más específica", () => {
    const by = Object.fromEntries(s.lines.map((l) => [l.categoryId, l]));
    expect(by.market!.executed).toBe(COP(400_000));
    expect(by.food!.executed).toBe(COP(150_000));
    expect(by.home!.executed).toBe(COP(2_000_000));
    expect(by.home!.committed).toBe(COP(100_000));
    expect(by.home!.projectedOverLimit).toBe(true);
    expect(s.unbudgeted.executed).toBe(COP(50_000));
    expect(s.totalExecuted).toBe(COP(2_600_000));
  });
  it("calcula saldo, % de ejecución, desviación y sin asignar", () => {
    const market = s.lines.find((l) => l.categoryId === "market")!;
    expect(market.remaining).toBe(COP(50_000));
    expect(market.executionPct).toBeCloseTo(0.8889, 3);
    expect(market.variance).toBe(-COP(50_000));
    expect(s.actualIncome).toBe(COP(5_000_000));
    expect(s.expectedIncome).toBe(COP(5_000_000));
    expect(s.unassigned).toBe(COP(5_000_000 - 2_950_000 - 500_000));
    expect(s.actualSavings).toBe(COP(2_400_000));
  });
  it("línea con presupuesto cero no divide por cero", () => {
    const z = computeBudget({
      month: "2026-05-01",
      today: "2026-05-10",
      lines: [{ id: "z", categoryId: "fun", planned: 0 }],
      categories: cats,
      txs,
      rules: [],
      baseCurrency: "COP",
    });
    expect(z.lines[0]!.executionPct).toBeNull();
    expect(z.lines[0]!.overLimit).toBe(true);
  });
});

describe("proyección al cierre", () => {
  it("usa el promedio histórico de la categoría para los días restantes y suma compromisos externos", () => {
    const hist = [
      tx({ categoryId: "market", amount: COP(800_000), date: "2026-03-05", postedOn: "2026-03-05" }),
      tx({ categoryId: "market", amount: COP(800_000), date: "2026-04-05", postedOn: "2026-04-05" }),
      tx({ categoryId: "market", amount: COP(600_000), date: "2026-05-03", postedOn: "2026-05-03" }),
      tx({ categoryId: "home", amount: COP(1), date: "2026-02-05", postedOn: "2026-02-05" }),
    ];
    const s = computeBudget({
      month: "2026-05-01",
      today: "2026-05-11", // 11 de 31 días transcurridos
      lines: [
        { id: "m", categoryId: "market", planned: COP(800_000) },
        { id: "h", categoryId: "home", planned: COP(2_000_000) },
      ],
      categories: cats,
      txs: hist,
      rules: [],
      baseCurrency: "COP",
      externalCommitted: [{ categoryId: "home", amount: COP(2_000_000) }],
    });
    const m = s.lines.find((l) => l.lineId === "m")!;
    // Promedio de 3 meses con gasto (feb, mar, abr): 1.600.000 / 3 ≈ 533.333 por mes.
    // 600.000 + 533.333 × 20/31 ≈ 944.086 (no la extrapolación lineal de 1.690.909).
    expect(m.projectedClose).toBe(COP(600_000) + Math.round((COP(1_600_000) / 3) * 20 / 31));
    expect(s.lines.find((l) => l.lineId === "h")!.committed).toBe(COP(2_000_000));
  });
});

describe("deudas", () => {
  it("convierte tasas: 24 % NAMV ≈ 26,82 % EA; 26,82 % EA ≈ 2 % EM", () => {
    expect(monthlyRate(24, "NAMV")).toBeCloseTo(0.02, 10);
    expect(effectiveAnnual(24, "NAMV")).toBeCloseTo(0.268242, 5);
    expect(monthlyRate(26.8242, "EA")).toBeCloseTo(0.02, 5);
    expect(effectiveAnnual(2, "EM")).toBeCloseTo(0.268242, 5);
    expect(() => monthlyRate(-1, "EA")).toThrow();
  });

  it("calcula cuota fija y amortiza hasta cero con intereses coherentes", () => {
    const i = monthlyRate(24, "NAMV");
    const cuota = fixedInstallment(COP(10_000_000), i, 12);
    expect(cuota).toBe(94_559_597); // ≈ 945.596 COP
    const r = amortize(COP(10_000_000), i, cuota);
    expect(r.status).toBe("paid_off");
    expect(r.months).toBe(12);
    expect(r.schedule[0]!.interest).toBe(COP(200_000));
    expect(r.totalPaid - r.totalInterest).toBe(COP(10_000_000));
    expect(fixedInstallment(1200, 0, 12)).toBe(100);
  });

  it("detecta cuotas que no cubren los intereses", () => {
    expect(amortize(COP(1_000_000), 0.03, COP(20_000)).status).toBe("never");
  });

  it("compara avalancha y bola de nieve", () => {
    const debts: DebtForPlan[] = [
      { id: "card", name: "Tarjeta", balance: COP(6_000_000), monthlyRate: monthlyRate(30, "EA"), minimumPayment: COP(300_000), monthlyFees: 0 },
      { id: "car", name: "Carro", balance: COP(1_500_000), monthlyRate: monthlyRate(14, "EA"), minimumPayment: COP(150_000), monthlyFees: 0 },
      { id: "fam", name: "Familiar", balance: COP(800_000), monthlyRate: 0, minimumPayment: COP(100_000), monthlyFees: 0 },
    ];
    const min = simulatePayoff(debts, "minimum");
    const ava = simulatePayoff(debts, "avalanche", COP(400_000));
    const snow = simulatePayoff(debts, "snowball", COP(400_000));
    expect(ava.feasible && snow.feasible && min.feasible).toBe(true);
    expect(ava.payoffOrder[0]!.id).toBe("card");
    expect(snow.payoffOrder[0]!.id).toBe("fam");
    expect(ava.totalInterest).toBeLessThanOrEqual(snow.totalInterest);
    expect(ava.totalInterest).toBeLessThan(min.totalInterest);
    expect(ava.months!).toBeLessThan(min.months!);
    // Lo pagado = capital + intereses + cargos.
    expect(ava.totalPaid).toBe(COP(8_300_000) + ava.totalInterest + ava.totalFees);
    expect(ava.paymentSeries.reduce((a, b) => a + b, 0)).toBe(ava.totalPaid);
  });

  it("advierte datos faltantes en lugar de inventarlos", () => {
    const r = simulatePayoff(
      [
        { id: "x", name: "Sin cuota", balance: 1000, monthlyRate: 0.01, minimumPayment: null, monthlyFees: 0 },
        { id: "y", name: "Sin tasa", balance: 1000, monthlyRate: null, minimumPayment: 100, monthlyFees: 0 },
      ],
      "avalanche",
    );
    expect(r.warnings.join(" ")).toMatch(/Sin cuota/);
    expect(r.warnings.join(" ")).toMatch(/Sin tasa/);
    expect(r.payoffOrder.map((p) => p.id)).toEqual(["y"]);
  });

  it("divide un pago en interés y capital", () => {
    expect(splitPayment(COP(300_000), COP(5_000_000), 0.02)).toEqual({
      interest: COP(100_000),
      fees: 0,
      principal: COP(200_000),
      estimated: true,
    });
  });
});
