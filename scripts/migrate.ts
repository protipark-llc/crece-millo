/** Aplica las migraciones versionadas de ./drizzle a DATABASE_URL. */
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { closeDb, getDb } from "../src/lib/db/client";

async function main() {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
  console.log("Migraciones aplicadas.");
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});
