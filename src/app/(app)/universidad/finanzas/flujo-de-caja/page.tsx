import type { Metadata } from "next";
import { financePage, first } from "@/server/page-data";
import { cashflowEstimates } from "@/server/services/finance-data";
import { buildCashflow, cashflowAlerts, type Granularity } from "@/lib/finance/cashflow";
import { addDays, addMonthsClamped, monthStart, weekStart } from "@/lib/finance/dates";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import { Alert, Badge, Card, CardHeader, PageHeader, Table, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { AutoSubmitForm } from "@/components/ui/auto-submit-form";
import { cn } from "@/components/ui/cn";
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
  const todayIdx = cf.buckets.findIndex((b) => b.phase === "mixed");
  const lowIdx = cf.buckets.findIndex((b) => b.start <= cf.lowestBalanceDate && cf.lowestBalanceDate <= b.end);
  const futureBuckets = cf.buckets.filter((b) => b.phase !== "actual").length;
  const unitWord = view === "month" ? (futureBuckets === 1 ? "mes" : "meses") : view === "week" ? (futureBuckets === 1 ? "semana" : "semanas") : futureBuckets === 1 ? "día" : "días";
  const dip = cf.lowestBalanceDate >= d.today ? (view === "month" ? `, con un bache en ${f.month(cf.lowestBalanceDate).replace(/ de \d{4}$/, "")}` : `, con un bache el ${f.date(cf.lowestBalanceDate)}`) : "";
  // Si el mínimo del periodo quedó en el pasado, también mostramos el menor cierre desde hoy.
  const futureLow = cf.lowestBalanceDate < d.today ? cf.buckets.filter((b) => b.phase !== "actual").reduce<(typeof cf.buckets)[number] | null>((m, b) => (!m || b.closing < m.closing ? b : m), null) : null;
  const field = "h-11 w-full rounded-md border border-control-border bg-surface px-3 text-sm text-ink";
  const seg = (active: boolean) =>
    cn("inline-flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium whitespace-nowrap sm:flex-none", active ? "bg-surface text-ink shadow-sm" : "text-ink-2 hover:text-ink");
  const signed = (v: number, kind: "in" | "out") => (v === 0 ? f.money(0) : kind === "in" ? `+${f.money(v)}` : `−${f.money(v)}`);
  return (
    <>
      <PageHeader
        eyebrow="Finanzas personales"
        title="Flujo de caja"
        description="Cuánto dinero entra y sale de tus cuentas líquidas: lo que ya pasó y lo que viene. Las transferencias entre tus cuentas no son ingreso ni gasto."
      />
      <Card className="mb-5 p-5">
        <AutoSubmitForm action="/universidad/finanzas/flujo-de-caja" className="grid gap-4 text-sm lg:grid-cols-[auto_1fr_1fr_1.4fr_auto] lg:items-end" aria-label="Supuestos del flujo de caja">
          <input type="hidden" name="vista" value={view} />
          <input type="hidden" name="escenario" value={scenario} />
          <div>
            <p className="mb-1.5 font-semibold text-ink">Escenario</p>
            <nav aria-label="Escenario" className="flex rounded-md bg-surface-2 p-1">
              {(["conservador", "base", "optimista"] as const).map((k) => (
                <Link key={k} href={qs({ escenario: k, ing: "", gas: "" })} aria-current={scenario === k ? "page" : undefined} className={seg(scenario === k)}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                </Link>
              ))}
            </nav>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Ingresos proyectados</span>
            <span className="relative">
              <input name="ing" defaultValue={String(incPct)} inputMode="decimal" className={cn(field, "pr-8 text-right tabular")} />
              <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">%</span>
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Gastos proyectados</span>
            <span className="relative">
              <input name="gas" defaultValue={String(expPct)} inputMode="decimal" className={cn(field, "pr-8 text-right tabular")} />
              <span aria-hidden className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted">%</span>
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold text-ink">Cuentas</span>
            <select name="cuenta" defaultValue={accountId ?? ""} className={field}>
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
          <div>
            <p className="mb-1.5 font-semibold text-ink">Ver por</p>
            <nav aria-label="Agrupar por" className="flex rounded-md bg-surface-2 p-1">
              {(
                [
                  ["month", "Mes"],
                  ["week", "Semana"],
                  ["day", "Día"],
                ] as const
              ).map(([k, l]) => (
                <Link key={k} href={qs({ vista: k })} aria-current={view === k ? "page" : undefined} className={seg(view === k)}>
                  {l}
                </Link>
              ))}
            </nav>
          </div>
          <label className="flex min-h-11 items-center gap-2.5 lg:col-span-5">
            <input type="checkbox" name="estimar" value="0" defaultChecked={!useEstimates && !accountId} className="size-5 accent-[var(--brand)]" />
            <span className="text-ink">Solo lo programado (sin estimaciones)</span>
          </label>
          <p className="text-xs text-muted lg:col-span-5">
            Supuestos: ingresos proyectados {incPct >= 0 ? "+" : "−"}
            {Math.abs(incPct)} %, gastos proyectados {expPct >= 0 ? "+" : "−"}
            {Math.abs(expPct)} %. Lo real nunca se ajusta. Se recalcula al instante.
            {notes.length > 0 && <> Estimado: {notes.join(" ")}</>}
            {accountId && " Al filtrar una cuenta solo se muestra lo programado en ella."}
          </p>
        </AutoSubmitForm>
      </Card>
      {cf.warnings.map((w) => (
        <Alert key={w} tone="warn" className="mb-4">
          {w}
        </Alert>
      ))}

      <Card className="mb-5 grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          {cf.firstNegativeDate ? (
            <Badge tone="neg">
              <OctagonAlert aria-hidden className="size-3" /> Déficit previsto
            </Badge>
          ) : (
            <Badge tone="pos">
              <CheckCircle2 aria-hidden className="size-3" /> Sin déficit previsto
            </Badge>
          )}
          <h2 className="t-answer mt-3 text-ink">
            {cf.firstNegativeDate ? (
              <>
                Tu caja podría quedar en negativo el <span className="text-neg">{f.date(cf.firstNegativeDate)}</span>.
              </>
            ) : futureBuckets > 0 ? (
              `Te alcanza en ${futureBuckets === 1 ? "el próximo" : `los próximos ${futureBuckets}`} ${unitWord}${dip}.`
            ) : (
              "Así se movió tu caja en el periodo."
            )}
          </h2>
          <p className="mt-3 text-ink-2">
            El punto más bajo del periodo, día a día, llega el <strong className="text-ink">{f.date(cf.lowestBalanceDate)}</strong> con{" "}
            <strong className={cn("tabular", cf.lowestBalance < 0 ? "text-neg" : "text-ink")}>{f.money(cf.lowestBalance)}</strong>.
            {futureLow && (
              <>
                {" "}
                Desde hoy, el cierre más bajo previsto es <strong className="tabular text-ink">{f.money(futureLow.closing)}</strong> ({f.date(futureLow.end)}).
              </>
            )}
          </p>
          {alerts.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {alerts.slice(0, 4).map((a, i) => (
                <li key={i} className={cn("flex items-start gap-1.5", a.severity === "critical" ? "text-neg" : "text-warn")}>
                  {a.severity === "critical" ? <OctagonAlert aria-hidden className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />}
                  <span>{a.message}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <dl className="grid grid-cols-2 overflow-hidden rounded-lg border border-border">
          <div className="p-4">
            <dt className="text-xs text-muted">Saldo hoy (registrado)</dt>
            <dd className="t-kpi mt-1 text-ink">{currentBalance !== undefined ? f.money(currentBalance) : "—"}</dd>
            <dd className="mt-0.5 text-xs text-muted">Incluye lo vencido asumido hoy</dd>
          </div>
          <div className="border-l border-border p-4">
            <dt className="text-xs text-muted">Saldo más bajo</dt>
            <dd className={cn("t-kpi mt-1", cf.lowestBalance < 0 ? "text-neg" : "text-ink")}>{f.money(cf.lowestBalance)}</dd>
            <dd className="mt-0.5 text-xs text-muted">{f.date(cf.lowestBalanceDate)}</dd>
          </div>
          <div className="border-t border-border p-4">
            <dt className="text-xs text-muted">Saldo al inicio · {f.date(cf.buckets[0]?.start ?? d.today)}</dt>
            <dd className="t-kpi mt-1 text-ink">{f.money(cf.opening)}</dd>
          </div>
          <div className="border-t border-l border-border p-4">
            <dt className="text-xs text-muted">Saldo final proyectado</dt>
            <dd className={cn("t-kpi mt-1", cf.closing < 0 ? "text-neg" : "text-ink")}>{f.money(cf.closing)}</dd>
            <dd className="mt-0.5 text-xs text-muted">{f.date(cf.buckets.at(-1)?.end ?? d.today)}</dd>
          </div>
        </dl>
      </Card>

      <Card className="mb-5 p-5">
        <h2 className="t-section text-ink">Saldo de caja {view === "month" ? "a fin de mes" : view === "week" ? "al cierre de cada semana" : "al cierre de cada día"}</h2>
        <p className="mt-1 text-xs text-muted">Línea continua: datos reales. Discontinua: proyección con previstos, recurrencias y estimaciones.</p>
        <div className="mt-3">
          <LineChart
            title="Saldo de caja al cierre de cada periodo"
            labels={labels}
            series={[{ key: "closing", label: "Saldo al cierre", color: "var(--chart-1)", values: cf.buckets.map((b) => b.closing) }]}
            currency={d.base}
            locale={d.locale}
            projectedFrom={firstProjected === -1 ? null : Math.max(0, firstProjected - 1)}
            todayIndex={todayIdx >= 0 ? todayIdx : null}
            mark={lowIdx >= 0 ? { index: lowIdx, value: cf.lowestBalance, label: `${f.money(cf.lowestBalance)} · ${f.date(cf.lowestBalanceDate).replace(/ \d{4}$/, "")}` } : null}
          />
        </div>
      </Card>
      <Card className="mb-5 p-5">
        <h2 className="t-section text-ink">Entradas y salidas {view === "month" ? "por mes" : view === "week" ? "por semana" : "por día"}</h2>
        <p className="mt-1 text-xs text-muted">Cada barra separa lo que ya pasó (sólido) de lo que viene (claro).</p>
        <div className="mt-3">
          <ColumnChart
            title="Ingresos y gastos por periodo"
            labels={labels}
            series={[
              { key: "in", label: "Ingresos", color: "var(--chart-1)", values: cf.buckets.map((b) => b.realIncome + b.projectedIncome) },
              { key: "out", label: "Gastos (incl. estimados)", color: "var(--chart-2)", values: cf.buckets.map((b) => b.realExpense + b.projectedExpense + b.estimatedExpense) },
            ]}
            currency={d.base}
            locale={d.locale}
            projectedFrom={firstProjected === -1 ? null : firstProjected}
          />
        </div>
      </Card>
      <Card>
        <CardHeader title={`Detalle por ${view === "month" ? "mes" : view === "week" ? "semana" : "día"}`} description="Saldo final = inicial + ingresos − gastos − estimados + transferencias con cuentas fuera del análisis y aperturas." />
        <Table caption="Flujo de caja por periodo">
          <thead>
            <tr>
              <th className={th}>{view === "month" ? "Mes" : "Periodo"}</th>
              <th className={thNum}>Inicial</th>
              <th className={thNum}>Ingresos reales</th>
              <th className={thNum}>Gastos reales</th>
              <th className={thNum}>Ingresos programados</th>
              <th className={thNum}>Gastos programados</th>
              <th className={thNum}>Estimados</th>
              <th className={thNum}>Transf. y aperturas</th>
              <th className={thNum}>Final</th>
            </tr>
          </thead>
          <tbody>
            {cf.buckets.map((b) => (
              <tr key={b.key} className={b.phase === "mixed" ? "bg-surface-2" : undefined}>
                <td className={`${td} whitespace-nowrap`}>
                  <span className="font-semibold">{view === "month" ? f.month(b.start) : f.date(b.start)}</span>
                  <span className="mt-1 block">
                    {b.phase === "actual" ? <Badge>Real</Badge> : b.phase === "mixed" ? <Badge tone="brand">En curso</Badge> : <Badge tone="info">Proyectado</Badge>}
                  </span>
                </td>
                <td className={tdNum}>{f.money(b.opening)}</td>
                <td className={`${tdNum} text-pos`}>{signed(b.realIncome, "in")}</td>
                <td className={`${tdNum} text-neg`}>{signed(b.realExpense, "out")}</td>
                <td className={`${tdNum} text-pos`}>{signed(b.projectedIncome, "in")}</td>
                <td className={`${tdNum} text-neg`}>{signed(b.projectedExpense, "out")}</td>
                <td className={`${tdNum} text-neg`}>{signed(b.estimatedExpense, "out")}</td>
                <td className={tdNum}>{f.money(b.transfersNet + b.accountOpenings)}</td>
                <td className={`${tdNum} font-semibold ${b.closing < 0 ? "text-neg" : ""}`}>{f.money(b.closing)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </>
  );
}
