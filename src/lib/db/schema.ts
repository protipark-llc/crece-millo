/**
 * Esquema PostgreSQL.
 *
 * Convenciones:
 * - Importes: BIGINT en unidades menores de la moneda (ver src/lib/money/money.ts).
 * - Fechas de calendario: DATE (cadena "YYYY-MM-DD" en la aplicación).
 * - Propiedad: toda tabla de datos financieros tiene `user_id`. Las referencias entre
 *   tablas usan claves foráneas compuestas (id, user_id), de modo que la base de datos
 *   impide que un movimiento apunte a la cuenta de otra persona.
 * - Además, las tablas con `user_id` tienen Row Level Security (migración 0001) y la
 *   aplicación accede a ellas siempre dentro de `withUser()`.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

const money = (name: string) => bigint(name, { mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());
const day = (name: string) => date(name, { mode: "string" });

export const accountType = pgEnum("account_type", ["cash", "checking", "savings", "digital_wallet", "investment", "other"]);
export const txKind = pgEnum("tx_kind", ["income", "expense", "transfer"]);
export const txStatus = pgEnum("tx_status", ["planned", "posted", "cancelled"]);
export const nature = pgEnum("nature", ["essential", "discretionary"]);
export const costBehavior = pgEnum("cost_behavior", ["fixed", "variable"]);
export const categoryKind = pgEnum("category_kind", ["income", "expense"]);
export const frequency = pgEnum("frequency", [
  "once",
  "daily",
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "yearly",
]);
export const incomeSource = pgEnum("income_source", [
  "salary",
  "fees",
  "sales",
  "business",
  "investment",
  "rental",
  "pension",
  "other",
]);
export const debtType = pgEnum("debt_type", [
  "credit_card",
  "mortgage",
  "vehicle",
  "personal_loan",
  "student_loan",
  "family",
  "employer",
  "informal",
  "other",
]);
export const rateBasis = pgEnum("rate_basis", ["EA", "NAMV", "EM"]);
export const debtStatus = pgEnum("debt_status", ["active", "paid_off", "paused"]);
export const assetType = pgEnum("asset_type", [
  "real_estate",
  "vehicle",
  "investment",
  "business",
  "retirement",
  "receivable",
  "valuables",
  "other",
]);
export const liquidity = pgEnum("liquidity", ["liquid", "semi_liquid", "illiquid"]);
export const goalType = pgEnum("goal_type", [
  "emergency_fund",
  "education",
  "housing",
  "travel",
  "asset_purchase",
  "financial_independence",
  "investment",
  "other",
]);
export const goalStatus = pgEnum("goal_status", ["active", "achieved", "paused", "archived"]);
export const incomeStability = pgEnum("income_stability", ["stable", "variable", "mixed"]);

/* ───────────── Identidad ───────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 del token: el token en claro solo vive en la cookie del navegador. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    success: boolean("success").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt)],
);

/* ───────────── Preferencias y diagnóstico ───────────── */

export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  country: text("country").notNull().default("CO"),
  currency: text("currency").notNull().default("COP"),
  locale: text("locale").notNull().default("es-CO"),
  timezone: text("timezone").notNull().default("America/Bogota"),
  planningPeriod: text("planning_period").notNull().default("monthly"),
  incomeStability: incomeStability("income_stability"),
  dependentsCount: smallint("dependents_count"),
  dependentsNotes: text("dependents_notes"),
  singleIncomeHousehold: boolean("single_income_household"),
  emergencyMonthsTarget: smallint("emergency_months_target"),
  /** Pasos del diagnóstico completados (claves estables). */
  diagnosticSteps: jsonb("diagnostic_steps").$type<string[]>().notNull().default([]),
  businessExpensesEnabled: boolean("business_expenses_enabled").notNull().default(false),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/* ───────────── Cuentas y categorías ───────────── */

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountType("type").notNull(),
    currency: text("currency").notNull(),
    openingBalance: money("opening_balance").notNull().default(0),
    openedOn: day("opened_on").notNull(),
    isLiquid: boolean("is_liquid").notNull(),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("accounts_id_user_uq").on(t.id, t.userId),
    unique("accounts_user_name_uq").on(t.userId, t.name),
    index("accounts_user_idx").on(t.userId),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKind("kind").notNull(),
    parentId: uuid("parent_id"),
    nature: nature("nature"),
    behavior: costBehavior("behavior"),
    /** Clave estable de las categorías creadas por el sistema (p. ej. "debts", "subscriptions"). */
    systemKey: text("system_key"),
    sortOrder: integer("sort_order").notNull().default(0),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("categories_id_user_uq").on(t.id, t.userId),
    unique("categories_user_name_uq").on(t.userId, t.kind, t.parentId, t.name).nullsNotDistinct(),
    foreignKey({ columns: [t.parentId, t.userId], foreignColumns: [t.id, t.userId], name: "categories_parent_fk" }),
    index("categories_user_idx").on(t.userId),
  ],
);

/* ───────────── Deudas, activos y objetivos (referenciados por movimientos) ───────────── */

export const assets = pgTable(
  "assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: assetType("type").notNull(),
    currency: text("currency").notNull(),
    liquidity: liquidity("liquidity").notNull(),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique("assets_id_user_uq").on(t.id, t.userId), index("assets_user_idx").on(t.userId)],
);

export const assetValuations = pgTable(
  "asset_valuations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    assetId: uuid("asset_id").notNull(),
    value: money("value").notNull(),
    valuedOn: day("valued_on").notNull(),
    source: text("source"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ columns: [t.assetId, t.userId], foreignColumns: [assets.id, assets.userId], name: "asset_valuations_asset_fk" }).onDelete(
      "cascade",
    ),
    unique("asset_valuations_asset_day_uq").on(t.assetId, t.valuedOn),
    check("asset_valuations_value_nonneg", sql`${t.value} >= 0`),
  ],
);

export const debts = pgTable(
  "debts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    creditor: text("creditor"),
    type: debtType("type").notNull(),
    currency: text("currency").notNull(),
    openingBalance: money("opening_balance").notNull(),
    balanceDate: day("balance_date").notNull(),
    ratePercent: numeric("rate_percent", { precision: 9, scale: 4 }),
    rateBasis: rateBasis("rate_basis"),
    minimumPayment: money("minimum_payment"),
    paymentDay: smallint("payment_day"),
    remainingTermMonths: integer("remaining_term_months"),
    monthlyFees: money("monthly_fees").notNull().default(0),
    status: debtStatus("status").notNull().default("active"),
    daysPastDue: integer("days_past_due").notNull().default(0),
    arrearsAmount: money("arrears_amount"),
    securedAssetId: uuid("secured_asset_id"),
    customPriority: integer("custom_priority"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("debts_id_user_uq").on(t.id, t.userId),
    index("debts_user_idx").on(t.userId),
    foreignKey({ columns: [t.securedAssetId, t.userId], foreignColumns: [assets.id, assets.userId], name: "debts_asset_fk" }),
    check("debts_opening_nonneg", sql`${t.openingBalance} >= 0`),
    check("debts_rate_pair", sql`(${t.ratePercent} IS NULL) = (${t.rateBasis} IS NULL)`),
    check("debts_rate_range", sql`${t.ratePercent} IS NULL OR (${t.ratePercent} >= 0 AND ${t.ratePercent} <= 1000)`),
    check("debts_payment_day", sql`${t.paymentDay} IS NULL OR ${t.paymentDay} BETWEEN 1 AND 31`),
    check("debts_min_payment_nonneg", sql`${t.minimumPayment} IS NULL OR ${t.minimumPayment} >= 0`),
  ],
);

export const goals = pgTable(
  "goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: goalType("type").notNull(),
    currency: text("currency").notNull(),
    targetAmount: money("target_amount").notNull(),
    targetDate: day("target_date"),
    priority: smallint("priority").notNull().default(3),
    plannedMonthly: money("planned_monthly"),
    accountId: uuid("account_id"),
    status: goalStatus("status").notNull().default("active"),
    emergencyMonthsTarget: smallint("emergency_months_target"),
    notes: text("notes"),
    achievedAt: timestamp("achieved_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("goals_id_user_uq").on(t.id, t.userId),
    index("goals_user_idx").on(t.userId),
    foreignKey({ columns: [t.accountId, t.userId], foreignColumns: [accounts.id, accounts.userId], name: "goals_account_fk" }),
    check("goals_target_positive", sql`${t.targetAmount} > 0`),
    check("goals_priority_range", sql`${t.priority} BETWEEN 1 AND 5`),
  ],
);

export const goalContributions = pgTable(
  "goal_contributions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    goalId: uuid("goal_id").notNull(),
    /** Positivo = aporte, negativo = retiro. */
    amount: money("amount").notNull(),
    contributedOn: day("contributed_on").notNull(),
    note: text("note"),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ columns: [t.goalId, t.userId], foreignColumns: [goals.id, goals.userId], name: "goal_contributions_goal_fk" }).onDelete(
      "cascade",
    ),
    index("goal_contributions_goal_idx").on(t.goalId),
    check("goal_contributions_nonzero", sql`${t.amount} <> 0`),
  ],
);

/* ───────────── Movimientos y recurrencias ───────────── */

export const recurrenceRules = pgTable(
  "recurrence_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    kind: txKind("kind").notNull(),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    accountId: uuid("account_id").notNull(),
    toAccountId: uuid("to_account_id"),
    toAmount: money("to_amount"),
    categoryId: uuid("category_id"),
    nature: nature("nature"),
    incomeSource: incomeSource("income_source"),
    debtId: uuid("debt_id"),
    description: text("description").notNull(),
    counterparty: text("counterparty"),
    frequency: frequency("frequency").notNull(),
    startDate: day("start_date").notNull(),
    endDate: day("end_date"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("recurrence_rules_id_user_uq").on(t.id, t.userId),
    index("recurrence_rules_user_idx").on(t.userId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: "recurrence_rules_user_fk" }).onDelete("cascade"),
    foreignKey({ columns: [t.accountId, t.userId], foreignColumns: [accounts.id, accounts.userId], name: "recurrence_rules_account_fk" }),
    foreignKey({ columns: [t.toAccountId, t.userId], foreignColumns: [accounts.id, accounts.userId], name: "recurrence_rules_to_account_fk" }),
    foreignKey({ columns: [t.categoryId, t.userId], foreignColumns: [categories.id, categories.userId], name: "recurrence_rules_category_fk" }),
    foreignKey({ columns: [t.debtId, t.userId], foreignColumns: [debts.id, debts.userId], name: "recurrence_rules_debt_fk" }),
    check("recurrence_rules_amount_positive", sql`${t.amount} > 0`),
    check("recurrence_rules_dates", sql`${t.endDate} IS NULL OR ${t.endDate} >= ${t.startDate}`),
    check("recurrence_rules_transfer", sql`(${t.kind} = 'transfer') = (${t.toAccountId} IS NOT NULL)`),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    kind: txKind("kind").notNull(),
    status: txStatus("status").notNull(),
    amount: money("amount").notNull(),
    currency: text("currency").notNull(),
    accountId: uuid("account_id").notNull(),
    toAccountId: uuid("to_account_id"),
    toAmount: money("to_amount"),
    /** Fecha prevista o de vencimiento. */
    date: day("date").notNull(),
    /** Fecha efectiva en que el dinero entró o salió (solo si status = posted). */
    postedOn: day("posted_on"),
    categoryId: uuid("category_id"),
    nature: nature("nature"),
    incomeSource: incomeSource("income_source"),
    description: text("description").notNull(),
    counterparty: text("counterparty"),
    notes: text("notes"),
    reconciled: boolean("reconciled").notNull().default(false),
    recurrenceRuleId: uuid("recurrence_rule_id"),
    occurrenceDate: day("occurrence_date"),
    debtId: uuid("debt_id"),
    /** Clave de idempotencia del formulario: evita duplicados por doble envío. */
    idempotencyKey: text("idempotency_key"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("transactions_id_user_uq").on(t.id, t.userId),
    unique("transactions_rule_occurrence_uq").on(t.recurrenceRuleId, t.occurrenceDate),
    unique("transactions_idempotency_uq").on(t.userId, t.idempotencyKey),
    index("transactions_user_date_idx").on(t.userId, t.date),
    index("transactions_user_posted_idx").on(t.userId, t.postedOn),
    index("transactions_account_idx").on(t.accountId),
    foreignKey({ columns: [t.userId], foreignColumns: [users.id], name: "transactions_user_fk" }).onDelete("cascade"),
    foreignKey({ columns: [t.accountId, t.userId], foreignColumns: [accounts.id, accounts.userId], name: "transactions_account_fk" }),
    foreignKey({ columns: [t.toAccountId, t.userId], foreignColumns: [accounts.id, accounts.userId], name: "transactions_to_account_fk" }),
    foreignKey({ columns: [t.categoryId, t.userId], foreignColumns: [categories.id, categories.userId], name: "transactions_category_fk" }),
    foreignKey({
      columns: [t.recurrenceRuleId, t.userId],
      foreignColumns: [recurrenceRules.id, recurrenceRules.userId],
      name: "transactions_rule_fk",
    }),
    foreignKey({ columns: [t.debtId, t.userId], foreignColumns: [debts.id, debts.userId], name: "transactions_debt_fk" }),
    check("transactions_amount_positive", sql`${t.amount} > 0`),
    check("transactions_transfer_target", sql`(${t.kind} = 'transfer') = (${t.toAccountId} IS NOT NULL)`),
    check("transactions_transfer_distinct", sql`${t.toAccountId} IS NULL OR ${t.toAccountId} <> ${t.accountId}`),
    check("transactions_to_amount_positive", sql`${t.toAmount} IS NULL OR ${t.toAmount} > 0`),
    check("transactions_posted_date", sql`(${t.status} = 'posted') = (${t.postedOn} IS NOT NULL)`),
    check("transactions_occurrence_pair", sql`(${t.recurrenceRuleId} IS NULL) = (${t.occurrenceDate} IS NULL)`),
  ],
);

export const debtPayments = pgTable(
  "debt_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    debtId: uuid("debt_id").notNull(),
    transactionId: uuid("transaction_id"),
    paidOn: day("paid_on").notNull(),
    amount: money("amount").notNull(),
    interest: money("interest").notNull(),
    fees: money("fees").notNull().default(0),
    principal: money("principal").notNull(),
    isExtra: boolean("is_extra").notNull().default(false),
    interestEstimated: boolean("interest_estimated").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({ columns: [t.debtId, t.userId], foreignColumns: [debts.id, debts.userId], name: "debt_payments_debt_fk" }).onDelete(
      "cascade",
    ),
    foreignKey({
      columns: [t.transactionId, t.userId],
      foreignColumns: [transactions.id, transactions.userId],
      name: "debt_payments_tx_fk",
    }).onDelete("cascade"),
    unique("debt_payments_tx_uq").on(t.transactionId),
    index("debt_payments_debt_idx").on(t.debtId),
    check("debt_payments_parts", sql`${t.amount} = ${t.interest} + ${t.fees} + ${t.principal}`),
    check("debt_payments_nonneg", sql`${t.amount} > 0 AND ${t.interest} >= 0 AND ${t.fees} >= 0 AND ${t.principal} >= 0`),
  ],
);

/* ───────────── Presupuesto ───────────── */

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Primer día del mes. */
    month: day("month").notNull(),
    currency: text("currency").notNull(),
    expectedIncome: money("expected_income"),
    savingsTarget: money("savings_target").notNull().default(0),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("budgets_id_user_uq").on(t.id, t.userId),
    unique("budgets_user_month_uq").on(t.userId, t.month),
    check("budgets_month_first_day", sql`EXTRACT(DAY FROM ${t.month}) = 1`),
    check("budgets_savings_nonneg", sql`${t.savingsTarget} >= 0`),
  ],
);

export const budgetLines = pgTable(
  "budget_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    budgetId: uuid("budget_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    planned: money("planned").notNull(),
    /** Si se presupuesta un gasto anual, se guarda aquí y `planned` = anual / 12. */
    annualAmount: money("annual_amount"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    foreignKey({ columns: [t.budgetId, t.userId], foreignColumns: [budgets.id, budgets.userId], name: "budget_lines_budget_fk" }).onDelete(
      "cascade",
    ),
    foreignKey({ columns: [t.categoryId, t.userId], foreignColumns: [categories.id, categories.userId], name: "budget_lines_category_fk" }),
    unique("budget_lines_budget_category_uq").on(t.budgetId, t.categoryId),
    check("budget_lines_planned_nonneg", sql`${t.planned} >= 0`),
  ],
);

/* ───────────── Otros ───────────── */

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: numeric("rate", { precision: 20, scale: 10 }).notNull(),
    asOf: day("as_of").notNull(),
    source: text("source").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("exchange_rates_uq").on(t.userId, t.fromCurrency, t.toCurrency, t.asOf),
    check("exchange_rates_positive", sql`${t.rate} > 0`),
    check("exchange_rates_distinct", sql`${t.fromCurrency} <> ${t.toCurrency}`),
  ],
);

export const scenarios = pgTable(
  "scenarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    assumptions: jsonb("assumptions").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("scenarios_user_idx").on(t.userId)],
);

export const courseEnrollments = pgTable(
  "course_enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseSlug: text("course_slug").notNull(),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [unique("course_enrollments_uq").on(t.userId, t.courseSlug)],
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseSlug: text("course_slug").notNull(),
    lessonSlug: text("lesson_slug").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    /** Respuestas del ejercicio práctico, si la lección tiene uno. */
    response: jsonb("response"),
    updatedAt: updatedAt(),
  },
  (t) => [unique("lesson_progress_uq").on(t.userId, t.courseSlug, t.lessonSlug)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_log_user_idx").on(t.userId, t.createdAt)],
);

/** Tablas con datos de una persona protegidas por RLS (ver drizzle/0001_rls.sql). */
export const RLS_TABLES = [
  "user_settings",
  "accounts",
  "categories",
  "assets",
  "asset_valuations",
  "debts",
  "goals",
  "goal_contributions",
  "recurrence_rules",
  "transactions",
  "debt_payments",
  "budgets",
  "budget_lines",
  "exchange_rates",
  "scenarios",
  "course_enrollments",
  "lesson_progress",
  "audit_log",
] as const;
