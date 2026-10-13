CREATE TABLE "copiloto_product_state" (
	"user_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"kind" text NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copiloto_product_state_user_id_product_id_kind_pk" PRIMARY KEY("user_id","product_id","kind"),
	CONSTRAINT "copiloto_product_state_values" CHECK ("copiloto_product_state"."kind" IN ('pc', 'mk') AND jsonb_typeof("copiloto_product_state"."data") = 'object')
);
--> statement-breakpoint
CREATE TABLE "copiloto_products" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"position" integer NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copiloto_products_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "copiloto_products_values" CHECK (char_length("copiloto_products"."id") BETWEEN 1 AND 64 AND jsonb_typeof("copiloto_products"."data") = 'object')
);
--> statement-breakpoint
CREATE TABLE "copiloto_saved" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"kind" text NOT NULL,
	"ts" bigint NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copiloto_saved_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "copiloto_saved_values" CHECK ("copiloto_saved"."kind" IN ('plan', 'sim') AND char_length("copiloto_saved"."id") BETWEEN 1 AND 64 AND jsonb_typeof("copiloto_saved"."data") = 'object')
);
--> statement-breakpoint
CREATE TABLE "copiloto_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"risk" smallint DEFAULT 5 NOT NULL,
	"cur" text DEFAULT 'COP' NOT NULL,
	"trm" double precision DEFAULT 3300 NOT NULL,
	"active" text NOT NULL,
	"marca" text DEFAULT '' NOT NULL,
	"tab" text DEFAULT 'ruta' NOT NULL,
	"ptab" text DEFAULT 'ficha' NOT NULL,
	"pf" jsonb NOT NULL,
	"checks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"test_form" jsonb NOT NULL,
	"plan_form" jsonb NOT NULL,
	"sim_form" jsonb NOT NULL,
	"origin" text DEFAULT 'default' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copiloto_settings_values" CHECK ("copiloto_settings"."risk" BETWEEN 1 AND 10 AND "copiloto_settings"."cur" IN ('COP', 'USD') AND "copiloto_settings"."trm" > 0 AND "copiloto_settings"."origin" IN ('default', 'legacy', 'import'))
);
--> statement-breakpoint
CREATE TABLE "copiloto_tests" (
	"user_id" uuid NOT NULL,
	"id" text NOT NULL,
	"product_id" text,
	"ts" bigint NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copiloto_tests_user_id_id_pk" PRIMARY KEY("user_id","id"),
	CONSTRAINT "copiloto_tests_values" CHECK (char_length("copiloto_tests"."id") BETWEEN 1 AND 64 AND jsonb_typeof("copiloto_tests"."data") = 'object')
);
--> statement-breakpoint
ALTER TABLE "copiloto_product_state" ADD CONSTRAINT "copiloto_product_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copiloto_products" ADD CONSTRAINT "copiloto_products_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copiloto_saved" ADD CONSTRAINT "copiloto_saved_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copiloto_settings" ADD CONSTRAINT "copiloto_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copiloto_tests" ADD CONSTRAINT "copiloto_tests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copiloto_tests_user_ts_idx" ON "copiloto_tests" USING btree ("user_id","ts");
--> statement-breakpoint
ALTER TABLE "copiloto_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copiloto_settings" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copiloto_settings_owner" ON "copiloto_settings" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "copiloto_products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copiloto_products" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copiloto_products_owner" ON "copiloto_products" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "copiloto_tests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copiloto_tests" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copiloto_tests_owner" ON "copiloto_tests" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "copiloto_product_state" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copiloto_product_state" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copiloto_product_state_owner" ON "copiloto_product_state" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
ALTER TABLE "copiloto_saved" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copiloto_saved" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copiloto_saved_owner" ON "copiloto_saved" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON "copiloto_settings", "copiloto_products", "copiloto_tests", "copiloto_product_state", "copiloto_saved" FROM %I', r);
    END IF;
  END LOOP;
END $$;
