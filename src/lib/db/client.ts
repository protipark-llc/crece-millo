import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __crecePool?: Pool; __creceDb?: DB };

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada. Copia .env.example a .env.");
  return new Pool({ connectionString: url, max: 10 });
}

export function getDb(): DB {
  if (!globalForDb.__creceDb) {
    globalForDb.__crecePool = createPool();
    globalForDb.__creceDb = drizzle(globalForDb.__crecePool, { schema });
  }
  return globalForDb.__creceDb;
}

export async function closeDb(): Promise<void> {
  await globalForDb.__crecePool?.end();
  globalForDb.__crecePool = undefined;
  globalForDb.__creceDb = undefined;
}

/**
 * Ejecuta `fn` en una transacción con `app.user_id` fijado (local a la transacción),
 * lo que activa las políticas RLS para esa persona. Toda lectura o escritura de datos
 * personales debe pasar por aquí; los filtros por user_id en las consultas siguen
 * siendo obligatorios (defensa en profundidad).
 */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("Identificador de usuario inválido");
  return getDb().transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
