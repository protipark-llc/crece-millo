import "server-only";
import { loadForUser } from "./action-utils";
import { loadFinanceData } from "./services/finance-data";
import { formatters } from "./format";

/** Datos financieros completos de la persona autenticada, con formateadores regionales. */
export async function financePage<T>(fn: (ctx: { d: Awaited<ReturnType<typeof loadFinanceData>>; tx: Parameters<Parameters<typeof loadForUser>[0]>[0]["tx"]; userId: string; f: ReturnType<typeof formatters> }) => Promise<T> | T): Promise<T> {
  return loadForUser(async ({ tx, userId }) => {
    const d = await loadFinanceData(tx, userId);
    return fn({ d, tx, userId, f: formatters(d.base, d.locale) });
  });
}

export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
