import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CalendarClock, Stethoscope } from "lucide-react";
import { financePage } from "@/server/page-data";
import { buildOverview, upcoming } from "@/server/services/dashboard";
import { DIAGNOSTIC_STEPS } from "@/server/services/settings";
import { categoryLabel } from "@/server/services/categories";
import { Badge, ButtonLink, Card, CardHeader, PageHeader, Meter } from "@/components/ui/primitives";
import { IndicatorGrid } from "@/components/finance/indicator-grid";
import { InsightList } from "@/components/finance/insight-list";
import { LineChart } from "@/components/charts/charts";

export const metadata: Metadata = { title: "Panel financiero" };

export default async function FinancePanel() {
  const data = await financePage(async ({ d, tx, userId, f }) => {
    const o = await buildOverview(tx, userId, d);
    const next = upcoming(d, 14).slice(0, 8);
    return { d, o, next, f };
  });
  const { d, o, next, f } = data;
  const doneSteps = d.settings.diagnosticSteps.length;
  const cashLabels = o.cash90.buckets.map((b) => f.date(b.start, "short").slice(0, 5));
  return (
    <>
      <PageHeader
        eyebrow="Finanzas personales"
        title="Tu centro de control"
        description="Dónde estás hoy, qué viene en las próximas semanas y qué acción concreta puedes tomar."
        actions={
          <>
            <ButtonLink href="/universidad/finanzas/movimientos/nuevo?tipo=expense" variant="secondary">
              <ArrowUpRight aria-hidden className="size-4" /> Gasto
            </ButtonLink>
            <ButtonLink href="/universidad/finanzas/movimientos/nuevo?tipo=income" variant="secondary">
              <ArrowDownLeft aria-hidden className="size-4" /> Ingreso
            </ButtonLink>
            <ButtonLink href="/universidad/finanzas/movimientos/nuevo?tipo=transfer" variant="secondary">
              <ArrowLeftRight aria-hidden className="size-4" /> Transferencia
            </ButtonLink>
          </>
        }
      />

      {doneSteps < DIAGNOSTIC_STEPS.length && (
        <Card className="mb-6 flex flex-wrap items-center gap-4 px-5 py-4">
          <Stethoscope aria-hidden className="size-5 text-brand" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">Completa tu diagnóstico financiero</p>
            <p className="text-sm text-ink-2">
              {doneSteps} de {DIAGNOSTIC_STEPS.length} pasos. Cuanta más información registres, más indicadores podremos calcular con fiabilidad.
            </p>
            <div className="mt-2 max-w-sm">
              <Meter value={doneSteps} max={DIAGNOSTIC_STEPS.length} label="Avance del diagnóstico" />
            </div>
          </div>
          <ButtonLink href="/universidad/finanzas/diagnostico">Continuar</ButtonLink>
        </Card>
      )}

      <section aria-labelledby="ind" className="mb-6">
        <h2 id="ind" className="sr-only">
          Indicadores
        </h2>
        <IndicatorGrid indicators={o.indicators} f={f} keys={["cash", "income", "expenses", "savings_rate"]} />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Caja proyectada · próximos 90 días"
            description={o.cash90.firstNegativeDate ? `Podría quedar en negativo el ${f.date(o.cash90.firstNegativeDate, "long")}.` : `Saldo más bajo previsto: ${f.money(o.cash90.lowestBalance)}.`}
            actions={<Link href="/universidad/finanzas/flujo-de-caja" className="text-sm font-medium text-brand hover:underline">Ver flujo de caja</Link>}
          />
          <div className="px-3 py-4 sm:px-5">
            {d.accounts.length ? (
              <LineChart
                title="Saldo de caja proyectado por semana"
                labels={cashLabels}
                series={[{ key: "bal", label: "Saldo al cierre de la semana", color: "var(--series-1)", values: o.cash90.buckets.map((b) => b.closing) }]}
                currency={d.base}
                locale={d.locale}
                projectedFrom={0}
              />
            ) : (
              <p className="py-10 text-center text-sm text-ink-2">
                Registra al menos una cuenta para ver tu caja.{" "}
                <Link className="font-medium text-brand hover:underline" href="/universidad/finanzas/cuentas">
                  Crear cuenta
                </Link>
              </p>
            )}
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Recomendaciones" description="Reglas transparentes sobre tus datos, no un modelo de IA." />
          <InsightList insights={o.insights} limit={5} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Próximos 14 días"
            description="Pagos e ingresos previstos y recurrentes pendientes."
            actions={<Link href="/universidad/finanzas/movimientos" className="text-sm font-medium text-brand hover:underline">Movimientos</Link>}
          />
          {next.length ? (
            <ul className="divide-y divide-border">
              {next.map((u) => (
                <li key={u.key} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <CalendarClock aria-hidden className="size-4 shrink-0 text-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">{u.description}</p>
                    <p className="text-xs text-muted">
                      {f.date(u.date)} · {u.kind === "transfer" ? "Transferencia" : categoryLabel(d.categoryRows, u.categoryId)}
                    </p>
                  </div>
                  {u.overdue && <Badge tone="warn">Vencido</Badge>}
                  <span className={`tabular whitespace-nowrap ${u.kind === "income" ? "text-pos" : "text-ink"}`}>
                    {u.kind === "income" ? "+" : u.kind === "expense" ? "−" : ""}
                    {f.money(u.amount, u.currency)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-6 text-sm text-ink-2">No hay pagos ni ingresos previstos en las próximas dos semanas.</p>
          )}
        </Card>
        <Card>
          <CardHeader
            title="Presupuesto del mes"
            description={o.budget ? `Ejecutado ${f.money(o.budget.totalExecuted)} de ${f.money(o.budget.totalPlanned)}` : "Aún no tienes presupuesto para este mes."}
            actions={<Link href="/universidad/finanzas/presupuesto" className="text-sm font-medium text-brand hover:underline">{o.budget ? "Ver detalle" : "Crear"}</Link>}
          />
          <div className="space-y-3 px-5 py-4">
            {o.budget ? (
              o.budget.lines
                .slice()
                .sort((a, b) => (b.executionPct ?? 0) - (a.executionPct ?? 0))
                .slice(0, 5)
                .map((l) => (
                  <div key={l.lineId}>
                    <div className="mb-1 flex justify-between gap-2 text-sm">
                      <span className="truncate text-ink">{categoryLabel(d.categoryRows, l.categoryId)}</span>
                      <span className="tabular text-ink-2">
                        {f.money(l.executed)} / {f.money(l.planned)}
                      </span>
                    </div>
                    <Meter value={l.executed} max={l.planned} tone={l.overLimit ? "neg" : l.projectedOverLimit ? "warn" : "brand"} label={categoryLabel(d.categoryRows, l.categoryId)} />
                    {l.overLimit && <p className="mt-0.5 text-xs text-neg">Excedido por {f.money(l.executed - l.planned)}</p>}
                  </div>
                ))
            ) : (
              <p className="text-sm text-ink-2">Un presupuesto es un plan: decide antes de gastar a dónde va cada peso. Puedes empezar desde cero o con una plantilla.</p>
            )}
          </div>
        </Card>
      </div>

      <section aria-labelledby="more" className="mt-6">
        <h2 id="more" className="mb-3 text-base font-semibold text-ink">
          Más indicadores
        </h2>
        <IndicatorGrid indicators={o.indicators} f={f} keys={["net_flow", "essential", "discretionary", "budget_execution", "debt_payments", "debt_service_ratio", "emergency_coverage", "net_worth", "net_worth_mom", "net_worth_yoy", "goals"]} />
      </section>
    </>
  );
}
