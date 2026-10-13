CREATE TABLE "copilot_plans" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"currency" text NOT NULL,
	"capital" bigint DEFAULT 0 NOT NULL,
	"reserve_bps" integer DEFAULT 3000 NOT NULL,
	"monthly_fixed" bigint DEFAULT 0 NOT NULL,
	"test_budget" bigint,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_plans_values" CHECK ("copilot_plans"."capital" >= 0 AND "copilot_plans"."monthly_fixed" >= 0 AND "copilot_plans"."reserve_bps" BETWEEN 0 AND 10000 AND ("copilot_plans"."test_budget" IS NULL OR "copilot_plans"."test_budget" > 0))
);
--> statement-breakpoint
CREATE TABLE "copilot_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'idea' NOT NULL,
	"currency" text NOT NULL,
	"supplier" text,
	"product_cost" bigint DEFAULT 0 NOT NULL,
	"shipping_cost" bigint DEFAULT 0 NOT NULL,
	"other_costs" bigint DEFAULT 0 NOT NULL,
	"return_shipping_cost" bigint DEFAULT 0 NOT NULL,
	"payment_fee_bps" integer DEFAULT 0 NOT NULL,
	"platform_fee_bps" integer DEFAULT 0 NOT NULL,
	"return_rate_bps" integer DEFAULT 0 NOT NULL,
	"expected_cpa" bigint DEFAULT 0 NOT NULL,
	"target_margin_bps" integer DEFAULT 2000 NOT NULL,
	"sale_price" bigint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_products_id_user_uq" UNIQUE("id","user_id"),
	CONSTRAINT "copilot_products_status" CHECK ("copilot_products"."status" IN ('idea', 'prueba', 'ganador', 'pausado', 'descartado')),
	CONSTRAINT "copilot_products_nonneg" CHECK ("copilot_products"."product_cost" >= 0 AND "copilot_products"."shipping_cost" >= 0 AND "copilot_products"."other_costs" >= 0 AND "copilot_products"."return_shipping_cost" >= 0 AND "copilot_products"."expected_cpa" >= 0 AND ("copilot_products"."sale_price" IS NULL OR "copilot_products"."sale_price" > 0)),
	CONSTRAINT "copilot_products_bps" CHECK ("copilot_products"."payment_fee_bps" BETWEEN 0 AND 5000 AND "copilot_products"."platform_fee_bps" BETWEEN 0 AND 5000 AND "copilot_products"."return_rate_bps" BETWEEN 0 AND 9000 AND "copilot_products"."target_margin_bps" BETWEEN 0 AND 8000)
);
--> statement-breakpoint
CREATE TABLE "copilot_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"started_on" date NOT NULL,
	"days" smallint NOT NULL,
	"ad_spend" bigint NOT NULL,
	"orders" integer NOT NULL,
	"channel" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_tests_values" CHECK ("copilot_tests"."days" BETWEEN 1 AND 90 AND "copilot_tests"."ad_spend" >= 0 AND "copilot_tests"."orders" >= 0)
);
--> statement-breakpoint
CREATE TABLE "dropship_progress" (
	"user_id" uuid NOT NULL,
	"step_key" text NOT NULL,
	"done_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dropship_progress_user_id_step_key_pk" PRIMARY KEY("user_id","step_key")
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "view_mode" text DEFAULT 'pro' NOT NULL;--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "sections" jsonb;--> statement-breakpoint
ALTER TABLE "copilot_plans" ADD CONSTRAINT "copilot_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_products" ADD CONSTRAINT "copilot_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_tests" ADD CONSTRAINT "copilot_tests_product_fk" FOREIGN KEY ("product_id","user_id") REFERENCES "public"."copilot_products"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dropship_progress" ADD CONSTRAINT "dropship_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copilot_products_user_idx" ON "copilot_products" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "copilot_tests_product_idx" ON "copilot_tests" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_view_mode" CHECK ("user_settings"."view_mode" IN ('esencial', 'pro', 'personalizada'));
--> statement-breakpoint
-- Row Level Security de las tablas nuevas (mismo patrón que 0001_rls.sql) y revocación de los
-- roles de la Data API de Supabase (mismo patrón que 0002_supabase_hardening.sql).
ALTER TABLE "copilot_products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copilot_products" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copilot_products_owner" ON "copilot_products" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "copilot_tests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copilot_tests" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copilot_tests_owner" ON "copilot_tests" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "copilot_plans" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copilot_plans" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copilot_plans_owner" ON "copilot_plans" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "dropship_progress" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "dropship_progress" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "dropship_progress_owner" ON "dropship_progress" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON "copilot_products", "copilot_tests", "copilot_plans", "dropship_progress" FROM %I', r);
    END IF;
  END LOOP;
END $$;
