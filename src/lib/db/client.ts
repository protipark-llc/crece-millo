import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import * as schema from "./schema";

export type DB = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as { __crecePool?: Pool; __creceDb?: DB };

/**
 * Crea el pool de conexiones.
 * - DATABASE_POOL_MAX: conexiones máximas (por defecto 10; en Vercel 3, porque cada
 *   función serverless tiene su propio pool y Supabase usa un pooler compartido).
 * - DATABASE_CA_CERT: certificado raíz (PEM) del proveedor. Si existe, la conexión exige
 *   TLS verificado y se ignora cualquier `sslmode` de la URL (en node-postgres, los valores
 *   de la URL prevalecen sobre las opciones explícitas).
 */
export function createPool(url = process.env.DATABASE_URL): Pool {
  if (!url) throw new Error("DATABASE_URL no está configurada. Copia .env.example a .env.");
  const max = Number(process.env.DATABASE_POOL_MAX) || (process.env.VERCEL ? 3 : 10);
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");
  if (ca) {
    const u = new URL(url);
    for (const k of ["sslmode", "sslcert", "sslkey", "sslrootcert", "uselibpqcompat"]) u.searchParams.delete(k);
    return new Pool({ connectionString: u.toString(), max, ssl: { ca, rejectUnauthorized: true } });
  }
  return new Pool({ connectionString: url, max });
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
