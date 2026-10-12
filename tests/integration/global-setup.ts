/**
 * Prepara una base de datos de pruebas limpia (TEST_DATABASE_URL) y aplica las migraciones.
 * Nunca toca la base de desarrollo.
 */
import { readFileSync } from "node:fs";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

function loadEnv() {
  try {
    for (const line of readFileSync(".env", "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]!]) process.env[m[1]!] = m[2]!;
    }
  } catch {
    /* sin .env: se usan las variables del entorno */
  }
}

export default async function setup() {
  loadEnv();
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("Define TEST_DATABASE_URL para las pruebas de integración");
  if (url === process.env.DATABASE_URL) throw new Error("TEST_DATABASE_URL no puede ser la misma base de desarrollo");
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
  process.env.DATABASE_URL = url;
}
