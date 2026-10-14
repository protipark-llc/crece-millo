import "./helpers";
import { afterAll, describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb, withUser } from "@/lib/db/client";
import { accounts, transactions } from "@/lib/db/schema";
import {
  buildCashflow,
  accountBalance,
  postedTotals,
} from "@/lib/finance/cashflow";
import { computeBudget } from "@/lib/finance/budget";
import { runVariants, DEFAULT_ASSUMPTIONS } from "@/lib/finance/scenarios";
import { createAccount, getAccount } from "@/server/services/accounts";
import { listCategories } from "@/server/services/categories";
import {
  createBudget,
  getBudgetForMonth,
  reallocate,
  upsertBudgetLine,
} from "@/server/services/budgets";
import {
  debtsForPlan,
  liquidBalance,
  loadFinanceData,
  monthlyReferences,
  netWorthNow,
} from "@/server/services/finance-data";
import {
  createDebt,
  recordDebtPayment,
  listDebts,
  addContribution,
  createGoal,
  listGoals,
} from "@/server/services/planning";
import {
  confirmOccurrence,
  createTransaction,
  deleteTransaction,
} from "@/server/services/transactions";
import { UserFacingError } from "@/server/services/errors";
import {
  transactionInput,
  accountInput,
  debtInput,
  debtPaymentInput,
  goalInput,
  contributionInput,
} from "@/server/validation";
import { newUser, TODAY } from "./helpers";

afterAll(async () => {
  await closeDb();
});

const acc = (over: Record<string, string> = {}) =>
  accountInput.parse({
    name: "Bancolombia ahorros",
    type: "savings",
    currency: "COP",
    openingBalance: "1.000.000",
    openedOn: "2026-09-01",
    ...over,
  });
const txIn = (over: Record<string, string>) =>
  transactionInput.parse({
    kind: "expense",
    status: "posted",
    amount: "100",
    date: "2026-10-01",
    description: "Mov",
    ...over,
  });
const COP = (p: number) => p * 100;

describe("flujo principal con persistencia real", () => {
  it("ingreso, gasto y caso de referencia: saldo 1.800.000 y tasa de ahorro 26,67 %", async () => {
    const user = await newUser("ref");
    const result = await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      const cats = await listCategories(tx, user.id);
      const salary = cats.find((c) => c.name === "Salario")!;
      const rent = cats.find((c) => c.name === "Arriendo o hipoteca")!;
      await createTransaction(
        tx,
        user.id,
        txIn({
          kind: "income",
          amount: "3.000.000",
          accountId: a.id,
          categoryId: salary.id,
          date: "2026-10-01",
        }),
        TODAY,
      );
      await createTransaction(
        tx,
        user.id,
        txIn({
          amount: "2.200.000",
          accountId: a.id,
          categoryId: rent.id,
          date: "2026-10-05",
        }),
        TODAY,
      );
      return loadFinanceData(tx, user.id, new Date("2026-10-12T15:00:00Z"));
    });
    expect(result.today).toBe(TODAY);
    const totals = postedTotals(result.txs, "2026-10-01", "2026-10-31", "COP");
    expect(totals.net).toBe(COP(800_000));
    expect(totals.net / totals.income).toBeCloseTo(0.2667, 4);
    expect(accountBalance(result.accounts[0]!, result.txs, TODAY)).toBe(
      COP(1_800_000),
    );
    expect(liquidBalance(result)).toBe(COP(1_800_000));
    const cf = buildCashflow({
      accounts: result.accounts,
      txs: result.txs,
      rules: result.rules,
      from: "2026-10-01",
      to: "2026-10-31",
      today: TODAY,
      granularity: "month",
      baseCurrency: "COP",
    });
    expect(cf.opening).toBe(COP(1_000_000));
    expect(cf.buckets[0]!.realIncome).toBe(COP(3_000_000));
    expect(cf.closing).toBe(COP(1_800_000));
  });

  it("transferencia entre cuentas propias no es ingreso ni gasto; los movimientos persisten", async () => {
    const user = await newUser("tr");
    const { a, b } = await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      const b = await createAccount(
        tx,
        user.id,
        acc({ name: "Nequi", type: "digital_wallet", openingBalance: "0" }),
      );
      await createTransaction(
        tx,
        user.id,
        txIn({
          kind: "transfer",
          amount: "250.000",
          accountId: a.id,
          toAccountId: b.id,
        }),
        TODAY,
      );
      return { a, b };
    });
    // Nueva transacción = "recargar la aplicación".
    const d = await withUser(user.id, (tx) =>
      loadFinanceData(tx, user.id, new Date("2026-10-12T15:00:00Z")),
    );
    expect(
      accountBalance(d.accounts.find((x) => x.id === a.id)!, d.txs, TODAY),
    ).toBe(COP(750_000));
    expect(
      accountBalance(d.accounts.find((x) => x.id === b.id)!, d.txs, TODAY),
    ).toBe(COP(250_000));
    const totals = postedTotals(d.txs, "2026-01-01", "2026-12-31", "COP");
    expect(totals.income + totals.expense).toBe(0);
    expect(liquidBalance(d)).toBe(COP(1_000_000));
  });

  it("idempotencia: el doble envío de un formulario no duplica el movimiento", async () => {
    const user = await newUser("idem");
    const count = await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      const input = txIn({
        amount: "50.000",
        accountId: a.id,
        idempotencyKey: "form-123",
      });
      const first = await createTransaction(tx, user.id, input, TODAY);
      const second = await createTransaction(tx, user.id, input, TODAY);
      expect(second.replayed).toBe(true);
      expect(second.row.id).toBe(first.row.id);
      const third = await createTransaction(
        tx,
        user.id,
        txIn({ amount: "50.000", accountId: a.id }),
        TODAY,
      );
      expect(third.duplicates.length).toBe(1); // advertencia de posible duplicado
      const n = (
        (await tx.execute(sql`select count(*)::int as n from transactions`))
          .rows[0] as { n: number }
      ).n;
      return n;
    });
    expect(count).toBe(2);
  });

  it("recurrencias: confirmar dos veces la misma ocurrencia no la duplica", async () => {
    const user = await newUser("rec");
    await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      const { row } = await createTransaction(
        tx,
        user.id,
        txIn({
          amount: "2.150.000",
          accountId: a.id,
          description: "Arriendo",
          status: "planned",
          date: "2026-10-05",
          frequency: "monthly",
        }),
        TODAY,
      );
      const ruleId = row.recurrenceRuleId!;
      expect(ruleId).toBeTruthy();
      // la ocurrencia de octubre ya existe (es el movimiento creado)
      await expect(
        confirmOccurrence(
          tx,
          user.id,
          { ruleId, occurrenceDate: "2026-10-05", action: "post" },
          TODAY,
        ),
      ).rejects.toThrow(/ya estaba registrada/);
      await confirmOccurrence(
        tx,
        user.id,
        { ruleId, occurrenceDate: "2026-11-05", action: "skip" },
        TODAY,
      );
      await expect(
        confirmOccurrence(
          tx,
          user.id,
          { ruleId, occurrenceDate: "2026-11-05", action: "skip" },
          TODAY,
        ),
      ).rejects.toThrow(/ya estaba registrada/);
      await expect(
        confirmOccurrence(
          tx,
          user.id,
          { ruleId, occurrenceDate: "2026-11-06", action: "post" },
          TODAY,
        ),
      ).rejects.toThrow(/no corresponde/);
      const d = await loadFinanceData(
        tx,
        user.id,
        new Date("2026-10-12T15:00:00Z"),
      );
      const cf = buildCashflow({
        accounts: d.accounts,
        txs: d.txs,
        rules: d.rules,
        from: "2026-10-01",
        to: "2026-12-31",
        today: TODAY,
        granularity: "month",
        baseCurrency: "COP",
      });
      // Oct: previsto guardado; Nov: omitido; Dic: virtual. Total proyectado = 2 arriendos.
      expect(cf.buckets.map((b) => b.projectedExpense)).toEqual([
        COP(2_150_000),
        0,
        COP(2_150_000),
      ]);
      // Eliminar una ocurrencia la anula en lugar de borrarla (no reaparece).
      const res = await deleteTransaction(tx, user.id, row.id);
      expect(res.cancelledInstead).toBe(true);
    });
    // La restricción única existe a nivel de base de datos.
    const rows = await getDb().execute(
      sql`select conname from pg_constraint where conname = 'transactions_rule_occurrence_uq'`,
    );
    expect(rows.rows.length).toBe(1);
  });

  it("presupuesto frente a ejecución real, plantilla y reasignación", async () => {
    const user = await newUser("bud");
    await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      const cats = await listCategories(tx, user.id);
      const market = cats.find((c) => c.name === "Mercado")!;
      const fun = cats.find((c) => c.name === "Salidas y fines de semana")!;
      const b = await createBudget(tx, user.id, {
        month: "2026-10-01",
        currency: "COP",
        copyFromMonth: null,
        expectedIncome: "4.000.000",
        savingsTarget: "400.000",
      });
      await upsertBudgetLine(tx, user.id, {
        budgetId: b.id,
        categoryId: market.id,
        planned: "800.000",
        annual: null,
      });
      await upsertBudgetLine(tx, user.id, {
        budgetId: b.id,
        categoryId: fun.id,
        planned: null,
        annual: "1.200.000",
      });
      await createTransaction(
        tx,
        user.id,
        txIn({ amount: "900.000", accountId: a.id, categoryId: market.id }),
        TODAY,
      );
      let loaded = (await getBudgetForMonth(tx, user.id, "2026-10-01"))!;
      expect(loaded.lines.find((l) => l.categoryId === fun.id)!.planned).toBe(
        COP(100_000),
      );
      const d = await loadFinanceData(
        tx,
        user.id,
        new Date("2026-10-12T15:00:00Z"),
      );
      const summary = computeBudget({
        month: "2026-10-01",
        today: TODAY,
        lines: loaded.lines.map((l) => ({
          id: l.id,
          categoryId: l.categoryId,
          planned: l.planned,
        })),
        categories: d.categories,
        txs: d.txs,
        rules: d.rules,
        baseCurrency: "COP",
        expectedIncome: loaded.budget.expectedIncome,
        savingsTarget: loaded.budget.savingsTarget,
      });
      const m = summary.lines.find((l) => l.categoryId === market.id)!;
      expect(m.executed).toBe(COP(900_000));
      expect(m.overLimit).toBe(true);
      expect(summary.unassigned).toBe(COP(4_000_000 - 900_000 - 400_000));
      // Reasignar 100.000 de ocio a mercado
      const funLine = loaded.lines.find((l) => l.categoryId === fun.id)!;
      const marketLine = loaded.lines.find((l) => l.categoryId === market.id)!;
      await reallocate(tx, user.id, {
        fromLineId: funLine.id,
        toLineId: marketLine.id,
        amount: "100.000",
      });
      loaded = (await getBudgetForMonth(tx, user.id, "2026-10-01"))!;
      expect(loaded.lines.find((l) => l.id === marketLine.id)!.planned).toBe(
        COP(900_000),
      );
      expect(loaded.lines.find((l) => l.id === funLine.id)!.planned).toBe(0);
      await expect(
        reallocate(tx, user.id, {
          fromLineId: funLine.id,
          toLineId: marketLine.id,
          amount: "1",
        }),
      ).rejects.toThrow(/más de lo presupuestado/);
      // Copiar como plantilla para noviembre
      const nov = await createBudget(tx, user.id, {
        month: "2026-11-01",
        currency: "COP",
        copyFromMonth: "2026-10-01",
        expectedIncome: null,
        savingsTarget: null,
      });
      const novLoaded = (await getBudgetForMonth(tx, user.id, "2026-11-01"))!;
      expect(novLoaded.lines.length).toBe(2);
      expect(nov.expectedIncome).toBe(COP(4_000_000));
    });
  });

  it("pago de deuda: gasto en caja + abono a capital, en una sola transacción", async () => {
    const user = await newUser("debt");
    await withUser(user.id, async (tx) => {
      const a = await createAccount(
        tx,
        user.id,
        acc({ openingBalance: "2.000.000" }),
      );
      const d = await createDebt(
        tx,
        user.id,
        debtInput.parse({
          name: "Tarjeta",
          type: "credit_card",
          currency: "COP",
          openingBalance: "5.000.000",
          balanceDate: "2026-09-30",
          ratePercent: "24",
          rateBasis: "NAMV",
          minimumPayment: "300.000",
        }),
      );
      const r = await recordDebtPayment(
        tx,
        user.id,
        debtPaymentInput.parse({
          debtId: d.id,
          accountId: a.id,
          amount: "300.000",
          paidOn: "2026-10-10",
        }),
        TODAY,
      );
      expect(r).toMatchObject({
        interest: COP(100_000),
        principal: COP(200_000),
        estimated: true,
      });
      const data = await loadFinanceData(
        tx,
        user.id,
        new Date("2026-10-12T15:00:00Z"),
      );
      expect(liquidBalance(data)).toBe(COP(1_700_000));
      expect(debtsForPlan(data)[0]!.balance).toBe(COP(4_800_000));
      expect(netWorthNow(data).netWorth).toBe(COP(1_700_000 - 4_800_000));
      // Pago mayor al saldo es rechazado
      await expect(
        recordDebtPayment(
          tx,
          user.id,
          debtPaymentInput.parse({
            debtId: d.id,
            accountId: a.id,
            amount: "9.000.000",
            paidOn: "2026-10-11",
            interest: "0",
          }),
          TODAY,
        ),
      ).rejects.toThrow(/supera el saldo/);
      // Eliminar el movimiento elimina el pago en la deuda (cascada)
      const payTx = data.txRows.find((t) => t.debtId === d.id)!;
      await tx
        .delete(transactions)
        .where(sql`${transactions.id} = ${payTx.id}`);
      const debts = await listDebts(tx, user.id);
      expect(debts[0]!.payments.length).toBe(0);
    });
  });

  it("objetivos: aportes, retiros y meta alcanzada", async () => {
    const user = await newUser("goal");
    await withUser(user.id, async (tx) => {
      const g = await createGoal(
        tx,
        user.id,
        goalInput.parse({
          name: "Fondo",
          type: "emergency_fund",
          currency: "COP",
          targetAmount: "1.000.000",
          initialAmount: "200.000",
        }),
        TODAY,
        null,
      );
      await addContribution(
        tx,
        user.id,
        contributionInput.parse({
          goalId: g.id,
          amount: "100.000",
          direction: "out",
          contributedOn: TODAY,
        }),
        TODAY,
      );
      await expect(
        addContribution(
          tx,
          user.id,
          contributionInput.parse({
            goalId: g.id,
            amount: "500.000",
            direction: "out",
            contributedOn: TODAY,
          }),
          TODAY,
        ),
      ).rejects.toThrow(/más de lo acumulado/);
      await addContribution(
        tx,
        user.id,
        contributionInput.parse({
          goalId: g.id,
          amount: "900.000",
          direction: "in",
          contributedOn: TODAY,
        }),
        TODAY,
      );
      const [goal] = await listGoals(tx, user.id);
      expect(goal!.accumulated).toBe(COP(1_000_000));
      expect(goal!.goal.status).toBe("achieved");
    });
  });
});

describe("validación de entradas", () => {
  it("rechaza importes, fechas y referencias inválidas", async () => {
    expect(
      transactionInput.safeParse({
        kind: "expense",
        status: "posted",
        amount: "",
        date: "2026-02-30",
        description: "",
        accountId: "x",
      }).success,
    ).toBe(false);
    expect(
      transactionInput.safeParse({
        kind: "transfer",
        status: "posted",
        amount: "1",
        date: "2026-02-01",
        description: "t",
        accountId: "9b2e0c7e-3b8f-4e6a-9f0e-0d6f3b1a2c4d",
      }).success,
    ).toBe(false);
    const user = await newUser("val");
    await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      const cats = await listCategories(tx, user.id);
      const salary = cats.find((c) => c.name === "Salario")!;
      await expect(
        createTransaction(
          tx,
          user.id,
          txIn({ amount: "-5", accountId: a.id }),
          TODAY,
        ),
      ).rejects.toThrow(/negativo/);
      await expect(
        createTransaction(
          tx,
          user.id,
          txIn({ amount: "0", accountId: a.id }),
          TODAY,
        ),
      ).rejects.toThrow(/mayor que cero/);
      await expect(
        createTransaction(
          tx,
          user.id,
          txIn({ amount: "10", accountId: a.id, date: "2026-12-01" }),
          TODAY,
        ),
      ).rejects.toThrow(/fecha futura/);
      await expect(
        createTransaction(
          tx,
          user.id,
          txIn({ amount: "10", accountId: a.id, date: "2026-08-01" }),
          TODAY,
        ),
      ).rejects.toThrow(/apertura/);
      await expect(
        createTransaction(
          tx,
          user.id,
          txIn({ amount: "10", accountId: a.id, categoryId: salary.id }),
          TODAY,
        ),
      ).rejects.toThrow(/no corresponde/);
    });
  });

  it("la base de datos impone reglas aunque se salte la aplicación", async () => {
    const user = await newUser("db");
    await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      await expect(
        tx.execute(
          sql`insert into transactions (user_id, kind, status, amount, currency, account_id, date, description) values (${user.id}, 'expense', 'posted', -5, 'COP', ${a.id}, '2026-10-01', 'x')`,
        ),
      ).rejects.toThrow();
    });
  });
});

describe("aislamiento entre usuarios", () => {
  it("una persona no puede ver ni usar datos de otra (servicios, FK compuestas y RLS)", async () => {
    const alice = await newUser("alice");
    const bob = await newUser("bob");
    const aliceAccount = await withUser(alice.id, (tx) =>
      createAccount(tx, alice.id, acc()),
    );
    // Servicio: Bob no encuentra la cuenta de Alice
    await withUser(bob.id, async (tx) => {
      await expect(
        getAccount(tx, bob.id, aliceAccount.id),
      ).rejects.toBeInstanceOf(UserFacingError);
      await expect(
        createTransaction(
          tx,
          bob.id,
          txIn({ amount: "10", accountId: aliceAccount.id }),
          TODAY,
        ),
      ).rejects.toThrow(/no existe o no te pertenece/);
    });
    // RLS: aun consultando sin filtro, Bob no ve filas de Alice
    const bobSees = await withUser(bob.id, (tx) => tx.select().from(accounts));
    expect(bobSees.find((r) => r.id === aliceAccount.id)).toBeUndefined();
    // RLS: Bob no puede insertar filas a nombre de Alice
    await expect(
      withUser(bob.id, (tx) =>
        tx.insert(accounts).values({
          userId: alice.id,
          name: "intrusa",
          type: "cash",
          currency: "COP",
          openingBalance: 0,
          openedOn: "2026-01-01",
          isLiquid: true,
        }),
      ),
    ).rejects.toThrow();
    // FK compuesta: aunque se fije el contexto de Bob, no puede referenciar la cuenta de Alice
    await expect(
      withUser(bob.id, (tx) =>
        tx.insert(transactions).values({
          userId: bob.id,
          kind: "expense",
          status: "planned",
          amount: 1,
          currency: "COP",
          accountId: aliceAccount.id,
          date: "2026-10-01",
          description: "x",
        }),
      ),
    ).rejects.toThrow();
    // Sin contexto de usuario, la tabla parece vacía
    const anonymous = await getDb().select().from(accounts);
    expect(anonymous.length).toBe(0);
  });
});

describe("simulaciones", () => {
  it("ejecutar escenarios no modifica los datos reales", async () => {
    const user = await newUser("sim");
    const fingerprint = async () =>
      withUser(user.id, async (tx) => {
        const r = await tx.execute(
          sql`select md5(string_agg(t::text, ',' order by t.id)) as h, count(*)::int as n from transactions t`,
        );
        const b = await tx.execute(
          sql`select md5(string_agg(a::text, ',' order by a.id)) as h from accounts a`,
        );
        return JSON.stringify([r.rows, b.rows]);
      });
    await withUser(user.id, async (tx) => {
      const a = await createAccount(tx, user.id, acc());
      await createTransaction(
        tx,
        user.id,
        txIn({ kind: "income", amount: "3.000.000", accountId: a.id }),
        TODAY,
      );
      await createTransaction(
        tx,
        user.id,
        txIn({ amount: "1.000.000", accountId: a.id }),
        TODAY,
      );
    });
    const before = await fingerprint();
    await withUser(user.id, async (tx) => {
      const d = await loadFinanceData(
        tx,
        user.id,
        new Date("2026-10-12T15:00:00Z"),
      );
      const refs = monthlyReferences(d);
      runVariants(
        {
          startDate: d.today,
          liquidBalance: liquidBalance(d),
          monthlyIncome: refs.income ?? 0,
          monthlyEssential: refs.essentialNoDebt ?? 0,
          monthlyDiscretionary: refs.discretionary ?? 0,
          otherAssets: 0,
          debts: debtsForPlan(d),
        },
        {
          ...DEFAULT_ASSUMPTIONS,
          incomeChangePct: -50,
          oneOffPurchase: { amount: COP(10_000_000), month: 1 },
        },
      );
    });
    expect(await fingerprint()).toBe(before);
  });
});
