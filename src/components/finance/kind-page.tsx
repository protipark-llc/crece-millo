import { Plus } from "lucide-react";
import { financePage } from "@/server/page-data";
import { monthEnd, monthStart } from "@/lib/finance/dates";
import { convert } from "@/lib/finance/fx";
import { effectiveDate } from "@/lib/finance/types";
import { virtualOccurrences } from "@/lib/finance/recurrence";
import { ButtonLink, Card, CardHeader, PageHeader, Stat } from "@/components/ui/primitives";
import { BarList } from "@/components/charts/charts";
import { loadTransactionsView, TransactionsView } from "./transactions-view";

const SOURCE_LABEL: Record<string, string> = { salary: "Salario", fees: "Honorarios", sales: "Ventas", business: "Negocio", investment: "Inversión", rental: "Arriendo", pension: "Pensión", other: "Otra" };

/** Página común de Ingresos y Gastos: resumen del mes + listado filtrado. */
export async function KindPage({ kind, params }: { kind: "income" | "expense"; params: Record<string, string | string[] | undefined> }) {
  const { d, f, view, stats } = await financePage(async ({ d, f, tx, userId }) => {
    const from = monthStart(d.today);
    const to = monthEnd(d.today);
    let done = 0;
    let pending = 0;
    const groups = new Map<string, number>();
    const rootName = (id: string | null | undefined) => {
      const c = d.categoryRows.find((x) => x.id === id);
      if (!c) return "Sin categoría";
      return c.parentId ? (d.categoryRows.find((x) => x.id === c.parentId)?.name ?? c.name) : c.name;
    };
    for (const t of d.txRows) {
      if (t.kind !== kind || t.status === "cancelled") continue;
      const date = t.status === "posted" ? effectiveDate(t) : t.date;
      if (date < from || date > to) continue;
      const v = convert(t.amount, t.currency, d.base, d.rates, date) ?? 0;
      if (t.status === "posted") {
        done += v;
        const key = kind === "income" ? (SOURCE_LABEL[t.incomeSource ?? ""] ?? rootName(t.categoryId)) : rootName(t.categoryId);
        groups.set(key, (groups.get(key) ?? 0) + v);
      } else pending += v;
    }
    for (const v of virtualOccurrences(d.rules, d.txs, from, to)) {
      if (v.kind === kind && v.date >= from) pending += convert(v.amount, v.currency, d.base, d.rates, v.date) ?? 0;
    }
    const view = await loadTransactionsView(tx, userId, d, params, kind);
    return { d, f, view, stats: { done, pending, groups: [...groups.entries()].sort((a, b) => b[1] - a[1]) } };
  });
  const income = kind === "income";
  return (
    <>
      <PageHeader
        title={income ? "Ingresos" : "Gastos"}
        description={
          income
            ? "El dinero previsto no es dinero disponible: un ingreso solo cuenta cuando lo recibes."
            : "Clasifica tus gastos en esenciales o discrecionales y fijos o variables para saber qué puedes ajustar."
        }
        actions={
          <ButtonLink href={`/universidad/finanzas/movimientos/nuevo?tipo=${kind}`}>
            <Plus aria-hidden className="size-4" /> {income ? "Registrar ingreso" : "Registrar gasto"}
          </ButtonLink>
        }
      />
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:col-span-1 lg:grid-cols-1">
          <Stat label={income ? "Recibido este mes" : "Pagado este mes"} value={f.money(stats.done)} sub={f.month(d.today)} />
          <Stat label={income ? "Previsto por recibir" : "Previsto por pagar"} value={f.money(stats.pending)} sub="Incluye recurrencias del mes" />
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title={income ? "Por fuente este mes" : "Por categoría este mes"} />
          <div className="p-5">
            {stats.groups.length ? (
              <BarList items={stats.groups.slice(0, 8).map(([label, value]) => ({ label, value }))} currency={d.base} locale={d.locale} total={stats.done} title={income ? "Ingresos por fuente" : "Gastos por categoría"} />
            ) : (
              <p className="text-sm text-ink-2">Aún no hay {income ? "ingresos recibidos" : "gastos pagados"} este mes.</p>
            )}
          </div>
        </Card>
      </div>
      <TransactionsView d={d} f={f} view={view} params={params} basePath={`/universidad/finanzas/${income ? "ingresos" : "gastos"}`} fixedKind={kind} />
    </>
  );
}
