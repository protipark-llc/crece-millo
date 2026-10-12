-- Row Level Security: segunda barrera de aislamiento entre usuarios.
-- La aplicación ejecuta cada operación con datos personales dentro de una transacción
-- que fija app.user_id (ver src/lib/db/client.ts → withUser). Sin ese valor, las
-- políticas no devuelven ni permiten escribir ninguna fila.
-- FORCE hace que la política aplique también al dueño de las tablas (el rol de la app).
CREATE OR REPLACE FUNCTION app_current_user_id() RETURNS uuid
  LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint
ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "user_settings_owner" ON "user_settings" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "accounts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "accounts_owner" ON "accounts" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "categories" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "categories_owner" ON "categories" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "assets" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "assets_owner" ON "assets" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "asset_valuations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "asset_valuations" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "asset_valuations_owner" ON "asset_valuations" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "debts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "debts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "debts_owner" ON "debts" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "goals" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "goals_owner" ON "goals" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "goal_contributions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "goal_contributions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "goal_contributions_owner" ON "goal_contributions" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "recurrence_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recurrence_rules" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recurrence_rules_owner" ON "recurrence_rules" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "transactions_owner" ON "transactions" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "debt_payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "debt_payments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "debt_payments_owner" ON "debt_payments" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "budgets" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "budgets_owner" ON "budgets" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "budget_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "budget_lines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "budget_lines_owner" ON "budget_lines" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "exchange_rates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "exchange_rates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "exchange_rates_owner" ON "exchange_rates" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "scenarios" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "scenarios" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "scenarios_owner" ON "scenarios" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "course_enrollments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "course_enrollments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "course_enrollments_owner" ON "course_enrollments" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "lesson_progress" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "lesson_progress" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "lesson_progress_owner" ON "lesson_progress" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "audit_log_owner" ON "audit_log" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
