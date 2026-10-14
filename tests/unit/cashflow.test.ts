import { describe, expect, it } from "vitest";
import {
  accountBalance,
  accountBalances,
  buildCashflow,
  postedTotals,
} from "@/lib/finance/cashflow";
import type { EngineAccount, EngineRule, EngineTx } from "@/lib/finance/types";

const COP = (pesos: number) => pesos * 100;

const checking: EngineAccount = {
  id: "chk",
  name: "Corriente",
  type: "checking",
  currency: "COP",
  openingBalance: COP(1_000_000),
  openedOn: "2026-01-01",
  isLiquid: true,
};
const savings: EngineAccount = {
  ...checking,
  id: "sav",
  name: "Ahorros",
  type: "savings",
  openingBalance: 0,
};
const broker: EngineAccount = {
  ...checking,
  id: "inv",
  name: "Inversión",
  type: "investment",
  openingBalance: 0,
  isLiquid: false,
};

let n = 0;
const tx = (over: Partial<EngineTx>): EngineTx => ({
  id: `t${++n}`,
  kind: "expense",
  status: "posted",
  amount: 0,
  currency: "COP",
  accountId: "chk",
  date: "2026-03-10",
  postedOn: "2026-03-10",
  reconciled: false,
  ...over,
});

describe("caso de referencia del enunciado", () => {
  const txs = [
    tx({
      kind: "income",
      amount: COP(3_000_000),
      date: "2026-03-01",
      postedOn: "2026-03-01",
    }),
    tx({
      kind: "expense",
      amount: COP(2_200_000),
      date: "2026-03-15",
      postedOn: "2026-03-15",
    }),
  ];
  it("flujo neto 800.000, saldo final 1.800.000, tasa de ahorro ≈ 26,67 %", () => {
    const t = postedTotals(txs, "2026-03-01", "2026-03-31", "COP");
    expect(t.income).toBe(COP(3_000_000));
    expect(t.expense).toBe(COP(2_200_000));
    expect(t.net).toBe(COP(800_000));
    expect(t.net / t.income).toBeCloseTo(0.2667, 4);
    const cf = buildCashflow({
      accounts: [checking],
      txs,
      rules: [],
      from: "2026-03-01",
      to: "2026-03-31",
      today: "2026-04-15",
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(cf.opening).toBe(COP(1_000_000));
    expect(cf.closing).toBe(COP(1_800_000));
    const b = cf.buckets[0]!;
    // Invariante: saldo final = inicial + ingresos − gastos + transferencias netas.
    expect(b.closing).toBe(
      b.opening +
        b.realIncome -
        b.realExpense +
        b.transfersNet +
        b.projectedIncome -
        b.projectedExpense +
        b.accountOpenings,
    );
    expect(accountBalance(checking, txs, "2026-03-31")).toBe(COP(1_800_000));
  });
});

describe("saldos", () => {
  it("un gasto realizado reduce el saldo; uno previsto no", () => {
    const txs = [
      tx({ amount: COP(50_000), postedOn: "2026-02-01", date: "2026-02-01" }),
      tx({
        amount: COP(70_000),
        status: "planned",
        postedOn: null,
        date: "2026-02-05",
      }),
    ];
    expect(accountBalance(checking, txs, "2026-02-28")).toBe(COP(950_000));
    const [bal] = accountBalances(
      [checking],
      txs,
      [],
      "2026-02-02",
      "2026-02-28",
    );
    expect(bal!.registered).toBe(COP(950_000));
    expect(bal!.projected).toBe(COP(880_000));
  });

  it("transferencia entre cuentas propias: no es ingreso ni gasto y conserva el total", () => {
    const txs = [
      tx({
        kind: "transfer",
        amount: COP(300_000),
        accountId: "chk",
        toAccountId: "sav",
        toAmount: COP(300_000),
      }),
    ];
    expect(accountBalance(checking, txs, "2026-12-31")).toBe(COP(700_000));
    expect(accountBalance(savings, txs, "2026-12-31")).toBe(COP(300_000));
    const totals = postedTotals(txs, "2026-01-01", "2026-12-31", "COP");
    expect(totals.income).toBe(0);
    expect(totals.expense).toBe(0);
    const cf = buildCashflow({
      accounts: [checking, savings],
      txs,
      rules: [],
      from: "2026-03-01",
      to: "2026-03-31",
      today: "2026-04-01",
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(cf.buckets[0]!.transfersNet).toBe(0);
    expect(cf.closing).toBe(COP(1_000_000));
  });

  it("transferencia hacia una cuenta no líquida sale de la caja como transferencia, no como gasto", () => {
    const txs = [
      tx({
        kind: "transfer",
        amount: COP(200_000),
        accountId: "chk",
        toAccountId: "inv",
        toAmount: COP(200_000),
      }),
    ];
    const cf = buildCashflow({
      accounts: [checking, broker],
      txs,
      rules: [],
      from: "2026-03-01",
      to: "2026-03-31",
      today: "2026-04-01",
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(cf.buckets[0]!.realExpense).toBe(0);
    expect(cf.buckets[0]!.transfersNet).toBe(-COP(200_000));
    expect(cf.closing).toBe(COP(800_000));
  });

  it("saldo conciliado solo cuenta movimientos conciliados; anulados no cuentan", () => {
    const txs = [
      tx({ amount: COP(10_000), reconciled: true }),
      tx({ amount: COP(20_000), reconciled: false }),
      tx({ amount: COP(99_000), status: "cancelled" }),
    ];
    expect(accountBalance(checking, txs, "2026-12-31", "reconciled")).toBe(
      COP(990_000),
    );
    expect(accountBalance(checking, txs, "2026-12-31", "registered")).toBe(
      COP(970_000),
    );
  });
});

describe("proyección", () => {
  const salary: EngineRule = {
    id: "sal",
    kind: "income",
    amount: COP(2_000_000),
    currency: "COP",
    accountId: "chk",
    description: "Salario",
    frequency: "monthly",
    startDate: "2026-01-30",
    active: true,
  };
  const rent: EngineRule = {
    ...salary,
    id: "rent",
    kind: "expense",
    amount: COP(2_500_000),
    startDate: "2026-01-05",
    description: "Arriendo",
  };

  it("detecta un déficit futuro y la fecha del primer saldo negativo", () => {
    const cf = buildCashflow({
      accounts: [checking],
      txs: [],
      rules: [salary, rent],
      from: "2026-01-01",
      to: "2026-06-30",
      today: "2026-01-01",
      granularity: "month",
      baseCurrency: "COP",
    });
    // 1.000.000 − 2.500.000 el 5 de enero → negativo.
    expect(cf.firstNegativeDate).toBe("2026-01-05");
    expect(
      cf.buckets.every((b) => b.projectedExpense > b.projectedIncome),
    ).toBe(true);
    expect(cf.opening).toBe(0);
    expect(cf.buckets[0]!.accountOpenings).toBe(COP(1_000_000));
    expect(cf.closing).toBe(COP(1_000_000 - 6 * 500_000));
  });

  it("no suma dos veces una ocurrencia ya materializada", () => {
    const materialized = tx({
      kind: "expense",
      amount: COP(2_500_000),
      status: "posted",
      date: "2026-01-05",
      postedOn: "2026-01-05",
      recurrenceRuleId: "rent",
      occurrenceDate: "2026-01-05",
    });
    const cf = buildCashflow({
      accounts: [checking],
      txs: [materialized],
      rules: [rent],
      from: "2026-01-01",
      to: "2026-01-31",
      today: "2026-01-10",
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(cf.buckets[0]!.realExpense).toBe(COP(2_500_000));
    expect(cf.buckets[0]!.projectedExpense).toBe(0);
  });

  it("un previsto vencido se asume hoy; un rango futuro arranca con el saldo proyectado", () => {
    const late = tx({
      kind: "expense",
      amount: COP(100_000),
      status: "planned",
      postedOn: null,
      date: "2026-02-01",
    });
    const cf = buildCashflow({
      accounts: [checking],
      txs: [late],
      rules: [],
      from: "2026-03-01",
      to: "2026-03-31",
      today: "2026-02-10",
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(cf.opening).toBe(COP(900_000));
  });

  it("escenario conservador ajusta solo lo proyectado", () => {
    const base = {
      accounts: [checking],
      txs: [
        tx({
          kind: "income",
          amount: COP(1_000_000),
          date: "2026-01-02",
          postedOn: "2026-01-02",
        }),
      ],
      rules: [salary],
      from: "2026-01-01",
      to: "2026-02-28",
      today: "2026-01-15",
      granularity: "month" as const,
      baseCurrency: "COP",
    };
    const normal = buildCashflow(base);
    const conservative = buildCashflow({
      ...base,
      projectedAdjust: { incomeFactorBps: 9000, expenseFactorBps: 11000 },
    });
    expect(conservative.buckets[0]!.realIncome).toBe(
      normal.buckets[0]!.realIncome,
    );
    expect(conservative.buckets[1]!.projectedIncome).toBe(COP(1_800_000));
  });

  it("excluye importes sin tasa de cambio y lo advierte", () => {
    const usd: EngineAccount = {
      ...checking,
      id: "usd",
      currency: "USD",
      openingBalance: 0,
    };
    const cf = buildCashflow({
      accounts: [checking, usd],
      txs: [
        tx({
          kind: "income",
          accountId: "usd",
          currency: "USD",
          amount: 10_000,
        }),
      ],
      rules: [],
      from: "2026-03-01",
      to: "2026-03-31",
      today: "2026-04-01",
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(cf.buckets[0]!.realIncome).toBe(0);
    expect(cf.warnings[0]).toMatch(/tasa de cambio/);
    const withRate = buildCashflow({
      accounts: [checking, usd],
      txs: [
        tx({
          kind: "income",
          accountId: "usd",
          currency: "USD",
          amount: 10_000,
        }),
      ],
      rules: [],
      rates: [{ from: "USD", to: "COP", rate: 4000, asOf: "2026-01-01" }],
      from: "2026-03-01",
      to: "2026-03-31",
      today: "2026-04-01",
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(withRate.buckets[0]!.realIncome).toBe(COP(400_000));
  });
});

describe("ocurrencias recurrentes vencidas", () => {
  it("una ocurrencia de los últimos 31 días sin confirmar se asume hoy", () => {
    const rule: EngineRule = {
      id: "gym",
      kind: "expense",
      amount: COP(100_000),
      currency: "COP",
      accountId: "chk",
      description: "Gimnasio",
      frequency: "monthly",
      startDate: "2026-02-05",
      active: true,
    };
    const first = tx({
      amount: COP(100_000),
      date: "2026-02-05",
      postedOn: "2026-02-05",
      recurrenceRuleId: "gym",
      occurrenceDate: "2026-02-05",
    });
    const cf = buildCashflow({
      accounts: [checking],
      txs: [first],
      rules: [rule],
      from: "2026-03-10",
      to: "2026-03-31",
      today: "2026-03-10",
      granularity: "month",
      baseCurrency: "COP",
    });
    // La del 5 de marzo (vencida) se asume hoy; la de abril queda fuera del rango.
    expect(cf.buckets[0]!.projectedExpense).toBe(COP(100_000));
    expect(cf.buckets[0]!.overdueCount).toBe(1);
  });
});

describe("estimaciones de gasto variable y deudas", () => {
  it("se aplican solo a días futuros y se reportan aparte", () => {
    const cf = buildCashflow({
      accounts: [checking],
      txs: [],
      rules: [],
      from: "2026-03-01",
      to: "2026-04-30",
      today: "2026-03-31",
      granularity: "month",
      baseCurrency: "COP",
      estimates: {
        variableExpenseMonthly: COP(300_000),
        debtPayments: [
          { date: "2026-04-10", amount: COP(200_000) },
          { date: "2026-02-10", amount: COP(999) },
        ],
      },
    });
    expect(cf.buckets[0]!.estimatedExpense).toBe(0); // marzo ya transcurrió (hoy = 31)
    expect(cf.buckets[1]!.estimatedExpense).toBe(COP(300_000) + COP(200_000));
    expect(cf.buckets[1]!.realExpense + cf.buckets[1]!.projectedExpense).toBe(
      0,
    );
    expect(cf.closing).toBe(COP(1_000_000 - 500_000));
  });
});
