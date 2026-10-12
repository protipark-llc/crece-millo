/**
 * Aplica las migraciones versionadas de ./drizzle.
 *
 * Usa MIGRATION_DATABASE_URL si existe (en Supabase: la conexión directa o el pooler en
 * modo sesión, puerto 5432) y si no DATABASE_URL.
 *
 * Con `--on-build` (script vercel-build) solo migra cuando MIGRATE_ON_BUILD=true y, en Vercel,
 * únicamente en el entorno Production: aunque las variables se hayan asignado también a
 * Preview, una vista previa nunca modifica la base de producción.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPool } from "../src/lib/db/client";
import { connectionHint, describeSsl, poolConfig } from "../src/lib/db/ssl";

async function main() {
  if (process.argv.includes("--on-build")) {
    if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
      console.log(`Migraciones omitidas: entorno de Vercel "${process.env.VERCEL_ENV}" (solo se migra en production).`);
      return;
    }
    if (process.env.MIGRATE_ON_BUILD !== "true") {
      console.log("Migraciones omitidas en este build (MIGRATE_ON_BUILD no es 'true').");
      return;
    }
  }
  const url = process.env.MIGRATION_DATABASE_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Define MIGRATION_DATABASE_URL o DATABASE_URL para migrar.");
  const { summary } = poolConfig(url);
  console.log(describeSsl(summary));
  const pool = createPool(url);
  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    console.log("Migraciones aplicadas.");
  } catch (err) {
    const hint = connectionHint(err, summary, process.env.DATABASE_CA_CERT);
    if (hint) console.error(`\n>>> ${hint}\n`);
    throw err;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
