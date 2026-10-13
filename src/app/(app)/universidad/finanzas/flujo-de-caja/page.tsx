import type { Metadata } from "next";
import { financePage, first } from "@/server/page-data";
import { cashflowEstimates } from "@/server/services/finance-data";
import { buildCashflow, cashflowAlerts, type Granularity } from "@/lib/finance/cashflow";
import { addDays, addMonthsClamped, monthStart, weekStart } from "@/lib/finance/dates";
import { Alert, Card, CardHeader, PageHeader, Stat, Table, Tabs, buttonClass, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { ColumnChart, LineChart } from "@/components/charts/charts";

export const metadata: Metadata = { title: "Flujo de caja" };

const clampPct = (v: string | undefined, def: number) => {
  const n = Number((v ?? "").replace(",", "."));
  return Number.isFinite(n) && v !== undefined && v !== "" ? Math.max(-90, Math.min(200, n)) : def;
};

export default async function CashflowPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const view = (["day", "week", "month"] as Granularity[]).find((g) => g === first(p.vista)) ?? "month";
  const scenario = (["base", "optimista", "conservador"] as const).find((s) => s === first(p.escenario)) ?? "base";
  const incPct = clampPct(first(p.ing), scenario === "optimista" ? 5 : scenario === "conservador" ? -10 : 0);
  const expPct = clampPct(first(p.gas), scenario === "optimista" ? -5 : scenario === "conservador" ? 10 : 0);
  const accountId = first(p.cuenta);
  const useEstimates = first(p.estimar) !== "0" && !accountId;
  const { d, f, cf, notes } = await financePage(({ d, f }) => {
    const ranges: Record<Granularity, [string, string]> = {
      month: [addMonthsClamped(monthStart(d.today), -5, 1), addDays(addMonthsClamped(monthStart(d.today), 13, 1), -1)],
      week: [addDays(weekStart(d.today), -28), addDays(weekStart(d.today), 16 * 7 - 1)],
      day: [addDays(d.today, -14), addDays(d.today, 60)],
    };
    const [from, to] = ranges[view];
    const valid = accountId && d.accounts.some((a) => a.id === accountId);
    const est = cashflowEstimates(d);
    const cf = buildCashflow({
      accounts: d.accounts,
      txs: d.txs,
      rules: d.rules,
      from,
      to,
      today: d.today,
      granularity: view,
      baseCurrency: d.base,
      rates: d.rates,
      accountFilter: valid ? (a) => a.id === accountId : undefined,
      projectedAdjust: scenario === "base" && incPct === 0 && expPct === 0 ? undefined : { incomeFactorBps: 10000 + Math.round(incPct * 100), expenseFactorBps: 10000 + Math.round(expPct * 100) },
      estimates: useEstimates ? est : undefined,
    });
    return { d, f, cf, notes: useEstimates ? est.notes : [] };
  });
  const alerts = cashflowAlerts(cf, view, d.locale);
  const firstProjected = cf.buckets.findIndex((b) => b.phase === "projected");
  const label = (start: string) => (view === "month" ? f.axisMonth(start) : f.date(start, "short").slice(0, 5));
  const labels = cf.buckets.map((b) => label(b.start));
  const qs = (over: Record<string, string>) => {
    const s = new URLSearchParams({ vista: view, escenario: scenario, ...(accountId ? { cuenta: accountId } : {}), ...(useEstimates ? {} : { estimar: "0" }), ...over });
    return `?${s.toString()}`;
  };
  const currentBalance = cf.buckets.find((b) => b.phase === "mixed")?.closing;
  return (
    <>
      <PageHeader
        title="Flujo de caja"
        description="Cuánto dinero entra y sale de tus cuentas líquidas, lo que ya pasó y lo que viene. Las transferencias entre tus cuentas no cuentan como ingreso ni gasto."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          current={view}
          items={[
            { key: "month", label: "Mensual", href: qs({ vista: "month" }) },
            { key: "week", label: "Semanal", href: qs({ vista: "week" }) },
            { key: "day", label: "Diario", href: qs({ vista: "day" }) },
          ]}
        />
        <Tabs
          current={scenario}
          items={[
            { key: "conservador", label: "Conservador", href: qs({ escenario: "conservador" }) },
            { key: "base", label: "Base", href: qs({ escenario: "base" }) },
            { key: "optimista", label: "Optimista", href: qs({ escenario: "optimista" }) },
          ]}
        />
      </div>
      <Card className="mb-6 p-4">
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <input type="hidden" name="vista" value={view} />
          <input type="hidden" name="escenario" value={scenario} />
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Cuentas</span>
            <select name="cuenta" defaultValue={accountId ?? ""} className="h-9 rounded-lg border border-border-strong bg-surface px-2">
              <option value="">Todas las cuentas líquidas</option>
              {d.accountRows
                .filter((a) => !a.archivedAt)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Ajuste a ingresos proyectados (%)</span>
            <input name="ing" defaultValue={String(incPct)} inputMode="decimal" className="h-9 w-28 rounded-lg border border-border-strong bg-surface px-2 tabular" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-muted">Ajuste a gastos proyectados (%)</span>
            <input name="gas" defaultValue={String(expPct)} inputMode="decimal" className="h-9 w-28 rounded-lg border border-border-strong bg-surface px-2 tabular" />
          </label>
          <label className="flex h-9 items-center gap-2">
            <input type="checkbox" name="estimar" value="0" defaultChecked={!useEstimates && !accountId} className="accent-[var(--brand)]" />
            <span className="text-xs text-ink-2">Solo lo programado (sin estimaciones)</span>
          </label>
          <button className={buttonClass("secondary", "sm", "h-9")}>Recalcular</button>
          <p className="basis-full text-xs text-muted">
            Supuestos del escenario {scenario}: ingresos proyectados {incPct >= 0 ? "+" : ""}
            {incPct} %, gastos proyectados {expPct >= 0 ? "+" : ""}
            {expPct} %. Los movimientos reales nunca se ajustan.
            {notes.length > 0 && <> Estimaciones incluidas: {notes.join(" ")}</>}
            {accountId && " Al filtrar una cuenta solo se muestra lo programado en ella."}
          </p>
        </form>
      </Card>
      {cf.warnings.map((w) => (
        <Alert key={w} tone="warn" className="mb-4">
          {w}
        </Alert>
      ))}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.slice(0, 5).map((a, i) => (
            <Alert key={i} tone={a.severity === "critical" ? "neg" : "warn"}>
              {a.message}
            </Alert>
          ))}
        </div>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Saldo al inicio del periodo" value={f.money(cf.opening)} sub={f.date(cf.buckets[0]?.start ?? d.today)} />
        <Stat label="Saldo actual (registrado)" value={currentBalance !== undefined ? f.money(currentBalance) : "—"} sub="Incluye lo vencido asumido hoy" />
        <Stat label="Saldo final proyectado" value={f.money(cf.closing)} tone={cf.closing < 0 ? "neg" : undefined} sub={f.date(cf.buckets.at(-1)?.end ?? d.today)} />
        <Stat label="Saldo más bajo" value={f.money(cf.lowestBalance)} tone={cf.lowestBalance < 0 ? "neg" : undefined} sub={f.date(cf.lowestBalanceDate)} />
      </div>
      <Card className="mb-6">
        <CardHeader title="Saldo de caja" description="Línea continua: datos reales. Punteada: proyección con movimientos previstos, recurrencias y estimaciones." />
        <div className="px-3 py-4 sm:px-5">
          <LineChart
            title="Saldo de caja al cierre de cada periodo"
            labels={labels}
            series={[{ key: "closing", label: "Saldo al cierre", color: "var(--series-1)", values: cf.buckets.map((b) => b.closing) }]}
            currency={d.base}
            locale={d.locale}
            projectedFrom={firstProjected === -1 ? null : Math.max(0, firstProjected - 1)}
          />
        </div>
      </Card>
      <Card className="mb-6">
        <CardHeader title="Entradas y salidas" description="Ingresos y gastos de cada periodo: reales, previstos y estimados." />
        <div className="px-3 py-4 sm:px-5">
          <ColumnChart
            title="Ingresos y gastos por periodo"
            labels={labels}
            series={[
              { key: "in", label: "Ingresos", color: "var(--series-1)", values: cf.buckets.map((b) => b.realIncome + b.projectedIncome) },
              { key: "out", label: "Gastos (incl. estimados)", color: "var(--series-2)", values: cf.buckets.map((b) => b.realExpense + b.projectedExpense + b.estimatedExpense) },
            ]}
            currency={d.base}
            locale={d.locale}
            projectedFrom={firstProjected === -1 ? null : firstProjected}
          />
        </div>
      </Card>
      <Card>
        <CardHeader title="Detalle por periodo" description="Saldo final = inicial + ingresos − gastos − estimados + transferencias con cuentas fuera del análisis y aperturas de cuenta." />
        <Table caption="Flujo de caja por periodo">
          <thead>
            <tr>
              <th className={th}>Periodo</th>
              <th className={thNum}>Inicial</th>
              <th className={thNum}>Ingresos reales</th>
              <th className={thNum}>Gastos reales</th>
              <th className={thNum}>Ingresos previstos</th>
              <th className={thNum}>Gastos previstos</th>
              <th className={thNum}>Estimados</th>
              <th className={thNum}>Transf. y aperturas</th>
              <th className={thNum}>Final</th>
            </tr>
          </thead>
          <tbody>
            {cf.buckets.map((b) => (
              <tr key={b.key} className={b.phase === "mixed" ? "bg-brand-soft/40" : undefined}>
                <td className={`${td} whitespace-nowrap`}>
                  {view === "month" ? f.month(b.start) : f.date(b.start)}
                  <span className="block text-xs text-muted">{b.phase === "actual" ? "Real" : b.phase === "mixed" ? "En curso" : "Proyectado"}</span>
                </td>
                <td className={tdNum}>{f.money(b.opening)}</td>
                <td className={tdNum}>{f.money(b.realIncome)}</td>
                <td className={tdNum}>{f.money(b.realExpense)}</td>
                <td className={`${tdNum} text-muted`}>{f.money(b.projectedIncome)}</td>
                <td className={`${tdNum} text-muted`}>{f.money(b.projectedExpense)}</td>
                <td className={`${tdNum} text-muted`}>{f.money(b.estimatedExpense)}</td>
                <td className={tdNum}>{f.money(b.transfersNet + b.accountOpenings)}</td>
                <td className={`${tdNum} font-medium ${b.closing < 0 ? "text-neg" : ""}`}>{f.money(b.closing)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
