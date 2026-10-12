-- Blindaje para Supabase (inofensivo en un PostgreSQL normal).
--
-- Supabase publica el esquema `public` en su Data API (PostgREST) con los roles `anon` y
-- `authenticated`, que reciben privilegios por defecto sobre las tablas nuevas. Esta
-- aplicación NO usa esa API: todo el acceso pasa por el servidor. Por eso:
-- 1) se revocan todos los privilegios de esos roles (si existen) y los privilegios por defecto;
-- 2) se activa RLS en las tablas de identidad (users, sessions, login_attempts) con una
--    política que niega el acceso a `anon` y `authenticated` aunque alguien vuelva a otorgar
--    privilegios. Las demás tablas ya tienen RLS forzada por usuario (0001_rls.sql).
DO $$
DECLARE r text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', r);
      EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', r);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM %I', r);
    END IF;
  END LOOP;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "login_attempts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "users_server_only" ON "users" USING (current_user NOT IN ('anon', 'authenticated')) WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
--> statement-breakpoint
CREATE POLICY "sessions_server_only" ON "sessions" USING (current_user NOT IN ('anon', 'authenticated')) WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
--> statement-breakpoint
CREATE POLICY "login_attempts_server_only" ON "login_attempts" USING (current_user NOT IN ('anon', 'authenticated')) WITH CHECK (current_user NOT IN ('anon', 'authenticated'));
