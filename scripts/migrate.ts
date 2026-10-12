/**
 * Aplica las migraciones versionadas de ./drizzle.
 *
 * Usa MIGRATION_DATABASE_URL si existe (en Supabase: la conexión directa o el pooler en
 * modo sesión, puerto 5432) y si no DATABASE_URL.
 *
 * Con `--on-build` (script vercel-build) solo migra cuando MIGRATE_ON_BUILD=true, para que
 * los despliegues de vista previa no modifiquen la base de producción por accidente.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool } from "../src/lib/db/client";

async function main() {
  if (process.argv.includes("--on-build") && process.env.MIGRATE_ON_BUILD !== "true") {
    console.log("Migraciones omitidas en este build (MIGRATE_ON_BUILD no es 'true').");
    return;
  }
  const pool = createPool(process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL);
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("Migraciones aplicadas.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
