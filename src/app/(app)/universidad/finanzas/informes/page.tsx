import type { Metadata } from "next";
import { Download } from "lucide-react";
import { financePage, first } from "@/server/page-data";
import { periodBreakdown } from "@/server/services/finance-data";
import { addMonthsClamped, monthEnd, monthStart } from "@/lib/finance/dates";
import { convert } from "@/lib/finance/fx";
import { effectiveDate } from "@/lib/finance/types";
import { categoryLabel } from "@/server/services/categories";
import { Card, CardHeader, PageHeader, Stat, Table, Tabs, buttonClass, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { BarList, ColumnChart } from "@/components/charts/charts";

export const metadata: Metadata = { title: "Informes" };

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const months = first(p.meses) === "12" ? 12 : first(p.meses) === "3" ? 3 : 6;
  const { d, f, rows, byCategory, top, totals, from, to } = await financePage(({ d, f }) => {
    const end = monthStart(d.today);
    const start = addMonthsClamped(end, -(months - 1), 1);
    const rows = Array.from({ length: months }, (_, i) => {
      const m = addMonthsClamped(start, i, 1);
      return { month: m, ...periodBreakdown(d, m, monthEnd(m)) };
    });
    const from = start;
    const to = d.today;
    const totals = periodBreakdown(d, from, to);
    const byCat = new Map<string, number>();
    const expenses = d.txRows.filter((t) => t.kind === "expense" && t.status === "posted" && effectiveDate(t) >= from && effectiveDate(t) <= to);
    for (const t of expenses) {
      const c = d.categoryRows.find((x) => x.id === t.categoryId);
      const root = c?.parentId ? d.categoryRows.find((x) => x.id === c.parentId)?.name : c?.name;
      const key = root ?? "Sin categoría";
      byCat.set(key, (byCat.get(key) ?? 0) + (convert(t.amount, t.currency, d.base, d.rates, effectiveDate(t)) ?? 0));
    }
    const top = [...expenses].sort((a, b) => b.amount - a.amount).slice(0, 10);
    return { d, f, rows, byCategory: [...byCat.entries()].sort((a, b) => b[1] - a[1]), top, totals, from, to };
  });
  const savingsRate = totals.income > 0 ? totals.net / totals.income : null;
  return (
    <>
      <PageHeader
        title="Informes"
        description="Tus números en perspectiva: tendencia, en qué se va el dinero y qué parte es esencial."
        actions={
          <a href={`/universidad/finanzas/informes/exportar?desde=${from}&hasta=${to}`} className={buttonClass("secondary")}>
            <Download aria-hidden className="size-4" /> Exportar CSV
          </a>
        }
      />
      <div className="mb-6">
        <Tabs
          current={String(months)}
          items={[
            { key: "3", label: "3 meses", href: "?meses=3" },
            { key: "6", label: "6 meses", href: "?meses=6" },
            { key: "12", label: "12 meses", href: "?meses=12" },
          ]}
        />
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ingresos del periodo" value={f.money(totals.income)} sub={`${f.date(from)} – ${f.date(to)}`} />
        <Stat label="Gastos del periodo" value={f.money(totals.expense)} />
        <Stat label="Flujo neto" value={f.money(totals.net)} tone={totals.net < 0 ? "neg" : undefined} />
        <Stat label="Tasa de ahorro" value={f.pct(savingsRate)} help="(Ingresos − gastos) ÷ ingresos del periodo. Sin ingresos no se calcula." />
      </div>
      <Card className="mb-6">
        <CardHeader title="Ingresos y gastos por mes" description="Solo movimientos realizados. El mes en curso está incompleto." />
        <div className="px-3 py-4 sm:px-5">
          <ColumnChart
            title="Ingresos y gastos realizados por mes"
            labels={rows.map((r) => f.axisMonth(r.month))}
            series={[
              { key: "in", label: "Ingresos", color: "var(--chart-1)", values: rows.map((r) => r.income) },
              { key: "out", label: "Gastos", color: "var(--chart-2)", values: rows.map((r) => r.expense) },
            ]}
            currency={d.base}
            locale={d.locale}
          />
        </div>
        <Table caption="Resumen mensual">
          <thead>
            <tr>
              <th className={th}>Mes</th>
              <th className={thNum}>Ingresos</th>
              <th className={thNum}>Gastos</th>
              <th className={thNum}>Esenciales</th>
              <th className={thNum}>Discrecionales</th>
              <th className={thNum}>Flujo neto</th>
              <th className={thNum}>Tasa de ahorro</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month}>
                <td className={`${td} first-letter:uppercase`}>{f.month(r.month)}</td>
                <td className={tdNum}>{f.money(r.income)}</td>
                <td className={tdNum}>{f.money(r.expense)}</td>
                <td className={tdNum}>{f.money(r.essential)}</td>
                <td className={tdNum}>{f.money(r.discretionary + r.unclassified)}</td>
                <td className={`${tdNum} ${r.net < 0 ? "text-neg" : ""}`}>{f.money(r.net)}</td>
                <td className={tdNum}>{r.income > 0 ? f.pct(r.net / r.income) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="¿En qué se va el dinero?" description="Gastos realizados por categoría principal." />
          <div className="p-5">
            {byCategory.length ? (
              <BarList items={byCategory.slice(0, 12).map(([label, value]) => ({ label, value }))} currency={d.base} locale={d.locale} total={totals.expense} title="Gastos por categoría" />
            ) : (
              <p className="text-sm text-ink-2">Sin gastos en el periodo.</p>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Los 10 gastos más grandes" />
          <ul className="divide-y divide-border">
            {top.map((t) => (
              <li key={t.id} className="flex justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate text-ink">{t.description}</span>
                  <span className="text-xs text-muted">
                    {f.date(effectiveDate(t))} · {categoryLabel(d.categoryRows, t.categoryId)}
                  </span>
                </span>
                <span className="tabular whitespace-nowrap">{f.money(t.amount, t.currency)}</span>
              </li>
            ))}
            {!top.length && <li className="px-5 py-4 text-sm text-ink-2">Sin gastos en el periodo.</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
