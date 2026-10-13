-- OPCIONAL (recomendado en producción): rol de ejecución propio para la aplicación.
--
-- En Supabase el rol `postgres` puede saltarse RLS. Si la aplicación se conecta con un rol
-- que NO es dueño de las tablas y no tiene BYPASSRLS, las políticas de 0001_rls.sql se
-- aplican siempre, como una barrera adicional a los filtros por usuario del código.
--
-- Uso: ejecútalo una vez en el SQL Editor de Supabase DESPUÉS de la primera migración,
-- cambiando la contraseña. Luego usa este usuario en DATABASE_URL (pooler) y deja
-- MIGRATION_DATABASE_URL con el usuario `postgres` para las migraciones.
-- Con el pooler de Supabase el usuario se escribe como `crece_app.<project-ref>`.

CREATE ROLE crece_app WITH LOGIN PASSWORD 'CAMBIA-ESTA-CONTRASEÑA' NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO crece_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO crece_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO crece_app;
GRANT EXECUTE ON FUNCTION app_current_user_id() TO crece_app;
-- Tablas que creen migraciones futuras (ejecutadas por `postgres`):
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO crece_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO crece_app;
