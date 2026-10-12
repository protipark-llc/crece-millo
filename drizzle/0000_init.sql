CREATE TYPE "public"."account_type" AS ENUM('cash', 'checking', 'savings', 'digital_wallet', 'investment', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('real_estate', 'vehicle', 'investment', 'business', 'retirement', 'receivable', 'valuables', 'other');--> statement-breakpoint
CREATE TYPE "public"."category_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."cost_behavior" AS ENUM('fixed', 'variable');--> statement-breakpoint
CREATE TYPE "public"."debt_status" AS ENUM('active', 'paid_off', 'paused');--> statement-breakpoint
CREATE TYPE "public"."debt_type" AS ENUM('credit_card', 'mortgage', 'vehicle', 'personal_loan', 'student_loan', 'family', 'employer', 'informal', 'other');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('once', 'daily', 'weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'yearly');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('active', 'achieved', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."goal_type" AS ENUM('emergency_fund', 'education', 'housing', 'travel', 'asset_purchase', 'financial_independence', 'investment', 'other');--> statement-breakpoint
CREATE TYPE "public"."income_source" AS ENUM('salary', 'fees', 'sales', 'business', 'investment', 'rental', 'pension', 'other');--> statement-breakpoint
CREATE TYPE "public"."income_stability" AS ENUM('stable', 'variable', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."liquidity" AS ENUM('liquid', 'semi_liquid', 'illiquid');--> statement-breakpoint
CREATE TYPE "public"."nature" AS ENUM('essential', 'discretionary');--> statement-breakpoint
CREATE TYPE "public"."rate_basis" AS ENUM('EA', 'NAMV', 'EM');--> statement-breakpoint
CREATE TYPE "public"."tx_kind" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."tx_status" AS ENUM('planned', 'posted', 'cancelled');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "account_type" NOT NULL,
	"currency" text NOT NULL,
	"opening_balance" bigint DEFAULT 0 NOT NULL,
	"opened_on" date NOT NULL,
	"is_liquid" boolean NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "accounts_user_name_uq" UNIQUE("user_id","name")
);
--> statement-breakpoint
CREATE TABLE "asset_valuations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"value" bigint NOT NULL,
	"valued_on" date NOT NULL,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "asset_valuations_asset_day_uq" UNIQUE("asset_id","valued_on"),
	CONSTRAINT "asset_valuations_value_nonneg" CHECK ("asset_valuations"."value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "asset_type" NOT NULL,
	"currency" text NOT NULL,
	"liquidity" "liquidity" NOT NULL,
	"notes" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_id_user_uq" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"budget_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"planned" bigint NOT NULL,
	"annual_amount" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_lines_budget_category_uq" UNIQUE("budget_id","category_id"),
	CONSTRAINT "budget_lines_planned_nonneg" CHECK ("budget_lines"."planned" >= 0)
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"month" date NOT NULL,
	"currency" text NOT NULL,
	"expected_income" bigint,
	"savings_target" bigint DEFAULT 0 NOT NULL,
	"approved_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "budgets_user_month_uq" UNIQUE("user_id","month"),
	CONSTRAINT "budgets_month_first_day" CHECK (EXTRACT(DAY FROM "budgets"."month") = 1),
	CONSTRAINT "budgets_savings_nonneg" CHECK ("budgets"."savings_target" >= 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" "category_kind" NOT NULL,
	"parent_id" uuid,
	"nature" "nature",
	"behavior" "cost_behavior",
	"system_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "categories_user_name_uq" UNIQUE NULLS NOT DISTINCT("user_id","kind","parent_id","name")
);
--> statement-breakpoint
CREATE TABLE "course_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_slug" text NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "course_enrollments_uq" UNIQUE("user_id","course_slug")
);
--> statement-breakpoint
CREATE TABLE "debt_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"debt_id" uuid NOT NULL,
	"transaction_id" uuid,
	"paid_on" date NOT NULL,
	"amount" bigint NOT NULL,
	"interest" bigint NOT NULL,
	"fees" bigint DEFAULT 0 NOT NULL,
	"principal" bigint NOT NULL,
	"is_extra" boolean DEFAULT false NOT NULL,
	"interest_estimated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debt_payments_tx_uq" UNIQUE("transaction_id"),
	CONSTRAINT "debt_payments_parts" CHECK ("debt_payments"."amount" = "debt_payments"."interest" + "debt_payments"."fees" + "debt_payments"."principal"),
	CONSTRAINT "debt_payments_nonneg" CHECK ("debt_payments"."amount" > 0 AND "debt_payments"."interest" >= 0 AND "debt_payments"."fees" >= 0 AND "debt_payments"."principal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "debts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"creditor" text,
	"type" "debt_type" NOT NULL,
	"currency" text NOT NULL,
	"opening_balance" bigint NOT NULL,
	"balance_date" date NOT NULL,
	"rate_percent" numeric(9, 4),
	"rate_basis" "rate_basis",
	"minimum_payment" bigint,
	"payment_day" smallint,
	"remaining_term_months" integer,
	"monthly_fees" bigint DEFAULT 0 NOT NULL,
	"status" "debt_status" DEFAULT 'active' NOT NULL,
	"days_past_due" integer DEFAULT 0 NOT NULL,
	"arrears_amount" bigint,
	"secured_asset_id" uuid,
	"custom_priority" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "debts_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "debts_opening_nonneg" CHECK ("debts"."opening_balance" >= 0),
	CONSTRAINT "debts_rate_pair" CHECK (("debts"."rate_percent" IS NULL) = ("debts"."rate_basis" IS NULL)),
	CONSTRAINT "debts_rate_range" CHECK ("debts"."rate_percent" IS NULL OR ("debts"."rate_percent" >= 0 AND "debts"."rate_percent" <= 1000)),
	CONSTRAINT "debts_payment_day" CHECK ("debts"."payment_day" IS NULL OR "debts"."payment_day" BETWEEN 1 AND 31),
	CONSTRAINT "debts_min_payment_nonneg" CHECK ("debts"."minimum_payment" IS NULL OR "debts"."minimum_payment" >= 0)
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"from_currency" text NOT NULL,
	"to_currency" text NOT NULL,
	"rate" numeric(20, 10) NOT NULL,
	"as_of" date NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "exchange_rates_uq" UNIQUE("user_id","from_currency","to_currency","as_of"),
	CONSTRAINT "exchange_rates_positive" CHECK ("exchange_rates"."rate" > 0),
	CONSTRAINT "exchange_rates_distinct" CHECK ("exchange_rates"."from_currency" <> "exchange_rates"."to_currency")
);
--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"amount" bigint NOT NULL,
	"contributed_on" date NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_contributions_nonzero" CHECK ("goal_contributions"."amount" <> 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" "goal_type" NOT NULL,
	"currency" text NOT NULL,
	"target_amount" bigint NOT NULL,
	"target_date" date,
	"priority" smallint DEFAULT 3 NOT NULL,
	"planned_monthly" bigint,
	"account_id" uuid,
	"status" "goal_status" DEFAULT 'active' NOT NULL,
	"emergency_months_target" smallint,
	"notes" text,
	"achieved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "goals_target_positive" CHECK ("goals"."target_amount" > 0),
	CONSTRAINT "goals_priority_range" CHECK ("goals"."priority" BETWEEN 1 AND 5)
);
--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_slug" text NOT NULL,
	"lesson_slug" text NOT NULL,
	"completed_at" timestamp with time zone,
	"response" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_uq" UNIQUE("user_id","course_slug","lesson_slug")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurrence_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "tx_kind" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"account_id" uuid NOT NULL,
	"to_account_id" uuid,
	"to_amount" bigint,
	"category_id" uuid,
	"nature" "nature",
	"income_source" "income_source",
	"debt_id" uuid,
	"description" text NOT NULL,
	"counterparty" text,
	"frequency" "frequency" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurrence_rules_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "recurrence_rules_amount_positive" CHECK ("recurrence_rules"."amount" > 0),
	CONSTRAINT "recurrence_rules_dates" CHECK ("recurrence_rules"."end_date" IS NULL OR "recurrence_rules"."end_date" >= "recurrence_rules"."start_date"),
	CONSTRAINT "recurrence_rules_transfer" CHECK (("recurrence_rules"."kind" = 'transfer') = ("recurrence_rules"."to_account_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"assumptions" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "tx_kind" NOT NULL,
	"status" "tx_status" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" text NOT NULL,
	"account_id" uuid NOT NULL,
	"to_account_id" uuid,
	"to_amount" bigint,
	"date" date NOT NULL,
	"posted_on" date,
	"category_id" uuid,
	"nature" "nature",
	"income_source" "income_source",
	"description" text NOT NULL,
	"counterparty" text,
	"notes" text,
	"reconciled" boolean DEFAULT false NOT NULL,
	"recurrence_rule_id" uuid,
	"occurrence_date" date,
	"debt_id" uuid,
	"idempotency_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "transactions_rule_occurrence_uq" UNIQUE("recurrence_rule_id","occurrence_date"),
	CONSTRAINT "transactions_idempotency_uq" UNIQUE("user_id","idempotency_key"),
	CONSTRAINT "transactions_amount_positive" CHECK ("transactions"."amount" > 0),
	CONSTRAINT "transactions_transfer_target" CHECK (("transactions"."kind" = 'transfer') = ("transactions"."to_account_id" IS NOT NULL)),
	CONSTRAINT "transactions_transfer_distinct" CHECK ("transactions"."to_account_id" IS NULL OR "transactions"."to_account_id" <> "transactions"."account_id"),
	CONSTRAINT "transactions_to_amount_positive" CHECK ("transactions"."to_amount" IS NULL OR "transactions"."to_amount" > 0),
	CONSTRAINT "transactions_posted_date" CHECK (("transactions"."status" = 'posted') = ("transactions"."posted_on" IS NOT NULL)),
	CONSTRAINT "transactions_occurrence_pair" CHECK (("transactions"."recurrence_rule_id" IS NULL) = ("transactions"."occurrence_date" IS NULL))
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"country" text DEFAULT 'CO' NOT NULL,
	"currency" text DEFAULT 'COP' NOT NULL,
	"locale" text DEFAULT 'es-CO' NOT NULL,
	"timezone" text DEFAULT 'America/Bogota' NOT NULL,
	"planning_period" text DEFAULT 'monthly' NOT NULL,
	"income_stability" "income_stability",
	"dependents_count" smallint,
	"dependents_notes" text,
	"single_income_household" boolean,
	"emergency_months_target" smallint,
	"diagnostic_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"business_expenses_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_valuations" ADD CONSTRAINT "asset_valuations_asset_fk" FOREIGN KEY ("asset_id","user_id") REFERENCES "public"."assets"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_fk" FOREIGN KEY ("budget_id","user_id") REFERENCES "public"."budgets"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_category_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_fk" FOREIGN KEY ("parent_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_enrollments" ADD CONSTRAINT "course_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_fk" FOREIGN KEY ("debt_id","user_id") REFERENCES "public"."debts"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_tx_fk" FOREIGN KEY ("transaction_id","user_id") REFERENCES "public"."transactions"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "debts" ADD CONSTRAINT "debts_asset_fk" FOREIGN KEY ("secured_asset_id","user_id") REFERENCES "public"."assets"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_fk" FOREIGN KEY ("goal_id","user_id") REFERENCES "public"."goals"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_to_account_fk" FOREIGN KEY ("to_account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_category_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurrence_rules" ADD CONSTRAINT "recurrence_rules_debt_fk" FOREIGN KEY ("debt_id","user_id") REFERENCES "public"."debts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_fk" FOREIGN KEY ("to_account_id","user_id") REFERENCES "public"."accounts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_fk" FOREIGN KEY ("category_id","user_id") REFERENCES "public"."categories"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_rule_fk" FOREIGN KEY ("recurrence_rule_id","user_id") REFERENCES "public"."recurrence_rules"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_debt_fk" FOREIGN KEY ("debt_id","user_id") REFERENCES "public"."debts"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "assets_user_idx" ON "assets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_log_user_idx" ON "audit_log" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "debt_payments_debt_idx" ON "debt_payments" USING btree ("debt_id");--> statement-breakpoint
CREATE INDEX "debts_user_idx" ON "debts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_idx" ON "goal_contributions" USING btree ("goal_id");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "login_attempts_email_idx" ON "login_attempts" USING btree ("email","created_at");--> statement-breakpoint
CREATE INDEX "recurrence_rules_user_idx" ON "recurrence_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "scenarios_user_idx" ON "scenarios" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "transactions_user_posted_idx" ON "transactions" USING btree ("user_id","posted_on");--> statement-breakpoint
CREATE INDEX "transactions_account_idx" ON "transactions" USING btree ("account_id");