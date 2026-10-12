import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";

/** Recrea la base E2E y aplica las migraciones. */
export default async function setup() {
  const url = process.env.E2E_DATABASE_URL!;
  if (url === process.env.DATABASE_URL && !url.includes("e2e")) throw new Error("E2E_DATABASE_URL no puede ser la base de desarrollo");
  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;");
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}
