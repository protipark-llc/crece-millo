CREATE TABLE "copiloto_mentor_uso" (
	"user_id" uuid NOT NULL,
	"dia" date NOT NULL,
	"usos" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "copiloto_mentor_uso_user_id_dia_pk" PRIMARY KEY("user_id","dia"),
	CONSTRAINT "copiloto_mentor_uso_values" CHECK ("copiloto_mentor_uso"."usos" >= 0)
);
--> statement-breakpoint
ALTER TABLE "copiloto_mentor_uso" ADD CONSTRAINT "copiloto_mentor_uso_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "copiloto_mentor_uso" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "copiloto_mentor_uso" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "copiloto_mentor_uso_owner" ON "copiloto_mentor_uso" USING ("user_id" = app_current_user_id()) WITH CHECK ("user_id" = app_current_user_id());
--> statement-breakpoint
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON "copiloto_mentor_uso" FROM %I', r);
    END IF;
  END LOOP;
END $$;
