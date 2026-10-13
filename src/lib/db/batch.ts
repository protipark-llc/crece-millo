import { getTableColumns, sql, type SQLWrapper } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { Tx } from "./client";

type Spec = readonly [PgTable, SQLWrapper];
type Result<S extends Record<string, Spec>> = { [K in keyof S]: S[K][0]["$inferSelect"][] };

/**
 * Ejecuta varios `select()` de tabla completa en UNA sola consulta (json_agg por subconsulta)
 * y convierte cada fila con los mismos mapeos de Drizzle (fechas, bigint, numeric…).
 *
 * Con la base en otra región cada consulta cuesta un viaje de ida y vuelta; cargar las
 * 10-12 tablas de una pantalla de a una multiplicaba ese costo. El orden de cada subconsulta
 * (ORDER BY) se conserva en el arreglo resultante.
 */
export async function selectBatch<S extends Record<string, Spec>>(tx: Tx, specs: S): Promise<Result<S>> {
  const keys = Object.keys(specs);
  const pairs = keys.map((k) => sql`${k}::text, (select coalesce(json_agg(q), '[]'::json) from (${specs[k]![1]}) q)`);
  const res = await tx.execute(sql`select json_build_object(${sql.join(pairs, sql`, `)}) as r`);
  const raw = (res.rows[0] as { r: Record<string, Record<string, unknown>[]> }).r;
  const out = {} as Record<string, unknown[]>;
  for (const k of keys) {
    const columns = Object.entries(getTableColumns(specs[k]![0]));
    out[k] = (raw[k] ?? []).map((row) => {
      const o: Record<string, unknown> = {};
      for (const [prop, col] of columns) {
        const v = row[col.name];
        o[prop] = v === null || v === undefined ? null : col.mapFromDriverValue(v);
      }
      return o;
    });
  }
  return out as Result<S>;
}
