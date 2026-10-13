import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronDown, CreditCard, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { financePage, first } from "@/server/page-data";
import { debtSummaries, debtsForPlan, monthlyReferences } from "@/server/services/finance-data";
import { DEBT_TYPE_LABELS } from "@/server/services/planning";
import { amortize, RATE_BASIS_LABELS, simulatePayoff, STRATEGY_LABELS, type RateBasis, type Strategy } from "@/lib/finance/debt";
import { addMonthsClamped } from "@/lib/finance/dates";
import { parseAmount, toInputString } from "@/lib/money/money";
import { Alert, Badge, ButtonLink, Card, CardHeader, EmptyState, InfoTip, Meter, PageHeader, buttonClass } from "@/components/ui/primitives";
import { AutoSubmitForm } from "@/components/ui/auto-submit-form";
import { cn } from "@/components/ui/cn";
import { ConfirmAction } from "@/components/ui/form";
import { PaymentForm } from "@/components/finance/forms/debt-forms";
import { LineChart } from "@/components/charts/charts";
import { deletePaymentAction } from "../actions";

export const metadata: Metadata = { title: "Deudas" };

export default async function DebtsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const { d, f, list, plan, refs } = await financePage(({ d, f }) => ({ d, f, list: debtSummaries(d), plan: debtsForPlan(d), refs: monthlyReferences(d) }));
  let extra = 0;
  try {
    extra = first(p.extra) ? parseAmount(first(p.extra)!, d.base) : 0;
  } catch {
    extra = 0;
  }
  const active = list.filter((x) => x.debt.status !== "paid_off");
  const totalDebt = plan.reduce((s, x) => s + x.balance, 0);
  const totalMin = plan.reduce((s, x) => s + (x.minimumPayment ?? 0), 0);
  const known = plan.filter((x) => x.monthlyRate !== null);
  const weightedEa = known.length ? known.reduce((s, x) => s + x.balance * (Math.pow(1 + x.monthlyRate!, 12) - 1), 0) / Math.max(1, known.reduce((s, x) => s + x.balance, 0)) : null;
  const strategies: Strategy[] = ["minimum", "avalanche", "snowball", ...(plan.some((x) => x.customPriority) ? (["custom"] as Strategy[]) : [])];
  const results = plan.length ? strategies.map((s) => simulatePayoff(plan, s, extra)) : [];
  const baseline = results[0];
  const horizon = Math.min(120, Math.max(...results.map((r) => r.balanceSeries.length - 1), 1));
  const chartStrategies = results.filter((r) => r.strategy !== "custom").slice(0, 3);
  const colors = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)"];
  const monthShort = (months: number) => f.month(addMonthsClamped(d.today, months, 1), true).replace(" de ", " ").replace(".", "");
  // Recomendada: la estrategia factible (distinta de solo mínimos) con menos intereses; en empate, avalancha.
  const recommended = results
    .filter((r) => r.strategy !== "minimum" && r.feasible)
    .sort((a, b) => a.totalInterest - b.totalInterest || (a.strategy === "avalanche" ? -1 : 1))[0];
  const short = { minimum: "Solo pagos mínimos", avalanche: "Avalancha", snowball: "Bola de nieve", custom: "Tu orden" } as const;
  const desc = {
    minimum: "Pagas solo la cuota mínima de cada deuda.",
    avalanche: "El extra va a la deuda con mayor tasa.",
    snowball: "El extra va a la deuda de menor saldo.",
    custom: "El extra sigue la prioridad que definiste.",
  } as const;
  const maxMonths = Math.max(1, ...results.map((r) => r.months ?? 0));
  const maxInterest = Math.max(1, ...results.map((r) => (r.feasible ? r.totalInterest : 0)));
  const position = new Map((recommended?.payoffOrder ?? []).map((o, i) => [o.id, i + 1]));
  const ratio = refs.income ? totalMin / refs.income : null;
  return (
    <>
      <PageHeader
        eyebrow="Finanzas personales"
        title="Deudas y obligaciones"
        description="El costo real de cada deuda y qué pagar primero. Los resultados son estimaciones educativas, no garantías."
        actions={
          <ButtonLink href="/universidad/finanzas/deudas/nueva">
            <Plus aria-hidden className="size-4" /> Registrar deuda
          </ButtonLink>
        }
      />
      {list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<CreditCard className="size-6" />}
            title="No tienes deudas registradas"
            action={<ButtonLink href="/universidad/finanzas/deudas/nueva">Registrar deuda</ButtonLink>}
          >
            Incluye tarjetas, créditos y préstamos familiares. Saber cuánto debes y a qué tasa es el primer paso para pagar menos intereses.
          </EmptyState>
        </Card>
      ) : (
        <>
          <dl className="mb-5 grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-4">
            <div className="p-4">
              <dt className="text-[13px] text-muted">Deuda total</dt>
              <dd className="t-kpi mt-1 text-ink">{f.money(totalDebt)}</dd>
              <dd className="mt-0.5 text-xs text-muted">
                {active.length} {active.length === 1 ? "deuda" : "deudas"}
              </dd>
            </div>
            <div className="border-l border-border p-4">
              <dt className="text-[13px] text-muted">Cuotas mínimas al mes</dt>
              <dd className="t-kpi mt-1 text-ink">{f.money(totalMin)}</dd>
              <dd className={cn("mt-0.5 text-xs", ratio !== null && ratio > 0.3 ? "font-semibold text-warn" : "text-muted")}>
                {ratio === null ? "Registra ingresos para comparar" : `${ratio > 0.3 ? "! " : ""}${f.pct(ratio, 0)} de tu ingreso mensual`}
              </dd>
            </div>
            <div className="border-t border-border p-4 lg:border-t-0 lg:border-l">
              <dt className="inline-flex items-center gap-1 text-[13px] text-muted">
                Tasa promedio ponderada <InfoTip text="Promedio de las tasas efectivas anuales conocidas, ponderado por saldo." />
              </dt>
              <dd className="t-kpi mt-1 text-ink">{weightedEa === null ? "—" : `${f.pct(weightedEa)} E.A.`}</dd>
              <dd className="mt-0.5 text-xs text-muted">Según saldo de cada deuda</dd>
            </div>
            <div className="border-t border-l border-border p-4 lg:border-t-0">
              <dt className="text-[13px] text-muted">Intereses pagados registrados</dt>
              <dd className="t-kpi mt-1 text-ink">{f.money(list.reduce((s, x) => s + x.interestPaid, 0))}</dd>
              <dd className="mt-0.5 text-xs text-muted">Según los pagos que registraste</dd>
            </div>
          </dl>

          <Card className="mb-8 p-5 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="t-overline text-ink">¿Qué deuda pago primero?</p>
                <h2 className="t-answer mt-3 max-w-3xl text-ink">
                  {recommended && baseline
                    ? `${extra > 0 ? `Con ${f.money(extra)} extra al mes` : "Con tus cuotas actuales"}, ${short[recommended.strategy].toLowerCase()} te saca de deudas en ${monthShort(recommended.months!)}${
                        baseline.feasible && baseline.totalInterest - recommended.totalInterest > 0 ? ` y te ahorra ${f.money(baseline.totalInterest - recommended.totalInterest)} en intereses` : ""
                      }.`
                    : "Registra la cuota mínima de cada deuda activa para comparar estrategias."}
                </h2>
                <p className="mt-3 max-w-2xl text-ink-2">Pagas siempre la cuota mínima de todas y el extra va a una sola deuda. Cuando terminas una, su cuota pasa a la siguiente.</p>
              </div>
              <AutoSubmitForm action="/universidad/finanzas/deudas" className="w-full lg:w-64">
                <label className="flex flex-col gap-1.5 text-sm">
                  <span className="font-semibold text-ink">Abono extra mensual</span>
                  <span className="relative">
                    <span aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted">
                      $
                    </span>
                    <input
                      type="text"
                      name="extra"
                      defaultValue={extra ? toInputString(extra, d.base) : ""}
                      inputMode="numeric"
                      placeholder="0"
                      className="h-11 w-full rounded-md border border-control-border bg-surface pr-3 pl-7 text-right text-[15px] text-ink tabular"
                    />
                  </span>
                  <span className="text-xs text-muted">Se recalcula al cambiarlo.</span>
                </label>
              </AutoSubmitForm>
            </div>

            {results.length > 0 && baseline && (
              <>
                <ul className="mt-6 grid gap-3 md:grid-cols-3">
                  {results
                    .filter((r) => r.strategy !== "custom" || results.length > 3)
                    .map((r) => {
                      const isRec = recommended?.strategy === r.strategy;
                      return (
                        <li key={r.strategy} className={cn("rounded-lg p-4", isRec ? "border-2 border-brand bg-surface-2" : "border border-border")}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold text-ink">{short[r.strategy]}</p>
                            {isRec && (
                              <Badge tone="neutral" className="bg-brand text-brand-ink">
                                <Star aria-hidden className="size-3" /> Recomendada
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted">{desc[r.strategy]}</p>
                          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                            <dt className="text-muted">Sales de deudas</dt>
                            <dd className="font-semibold text-ink tabular">{r.months === null ? "No se completa" : `${monthShort(r.months)} · ${r.months} meses`}</dd>
                            <dt className="text-muted">Intereses</dt>
                            <dd className="font-semibold text-ink tabular">{r.feasible ? f.money(r.totalInterest) : "—"}</dd>
                            <dt className="text-muted">Ahorro vs. mínimos</dt>
                            <dd className="font-semibold text-pos tabular">
                              {r.strategy !== "minimum" && r.feasible && baseline.feasible ? f.money(baseline.totalInterest - r.totalInterest) : "—"}
                            </dd>
                          </dl>
                        </li>
                      );
                    })}
                </ul>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  {[
                    { title: "Cuándo sales de deudas", value: (r: (typeof results)[number]) => r.months ?? 0, max: maxMonths, label: (r: (typeof results)[number]) => (r.months === null ? "—" : monthShort(r.months)), note: "Barra = meses desde hoy. Más corta es mejor." },
                    { title: "Cuánto pagas de intereses", value: (r: (typeof results)[number]) => (r.feasible ? r.totalInterest : 0), max: maxInterest, label: (r: (typeof results)[number]) => (r.feasible ? f.money(r.totalInterest) : "—"), note: "Más corta es mejor." },
                  ].map((c) => (
                    <figure key={c.title}>
                      <figcaption className="mb-2 text-sm font-semibold text-ink">{c.title}</figcaption>
                      <ul className="space-y-2 text-sm">
                        {chartStrategies.map((r) => (
                          <li key={r.strategy} className="grid grid-cols-[96px_1fr] items-center gap-3">
                            <span className="text-ink-2">{short[r.strategy]}</span>
                            <span className="flex items-center gap-2">
                              <span
                                aria-hidden
                                className="h-3 rounded-xs"
                                style={{ width: `${Math.max(2, (c.value(r) / c.max) * 70)}%`, background: recommended?.strategy === r.strategy ? "var(--chart-1)" : "var(--surface-3)" }}
                              />
                              <span className={cn("whitespace-nowrap tabular", recommended?.strategy === r.strategy ? "font-semibold text-ink" : "text-ink-2")}>{c.label(r)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-xs text-muted">{c.note}</p>
                    </figure>
                  ))}
                </div>

                {recommended && recommended.payoffOrder.length > 1 && (
                  <p className="mt-5 rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink">
                    <strong className="font-semibold">Orden de pago · {short[recommended.strategy]}:</strong> {recommended.payoffOrder.map((o) => o.name).join(" → ")}
                  </p>
                )}
                <p className="mt-4 text-sm text-ink-2">
                  Avalancha minimiza intereses. Bola de nieve te da victorias tempranas que ayudan a sostener el hábito. Las dos funcionan si las mantienes. Supone tasas constantes y que no adquieres nuevas deudas.
                </p>
                {[...new Set(results.flatMap((r) => r.warnings))].map((w) => (
                  <Alert key={w} tone="warn" className="mt-3">
                    {w}
                  </Alert>
                ))}
                <details className="group mt-4">
                  <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1 text-sm font-semibold text-ink">
                    Ver el saldo mes a mes <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-3">
                    <LineChart
                      title="Saldo total de deudas por estrategia"
                      labels={Array.from({ length: horizon + 1 }, (_, i) => (i === 0 ? "Hoy" : `M${i}`))}
                      series={chartStrategies.map((r, i) => ({
                        key: r.strategy,
                        label: STRATEGY_LABELS[r.strategy],
                        color: colors[i]!,
                        values: Array.from({ length: horizon + 1 }, (_, m) => (m < r.balanceSeries.length ? r.balanceSeries[m]! : 0)),
                      }))}
                      currency={d.base}
                      locale={d.locale}
                    />
                  </div>
                </details>
              </>
            )}
          </Card>

          <h2 className="t-section mb-3 text-ink">Tus deudas</h2>
          <div className="mb-6 space-y-3">
            {active.map((x) => {
              const sim = x.monthlyRate !== null && x.debt.minimumPayment ? amortize(x.balance, x.monthlyRate, x.debt.minimumPayment, x.debt.monthlyFees) : null;
              const accounts = d.accountRows.filter((a) => !a.archivedAt && a.currency === x.debt.currency).map((a) => ({ id: a.id, name: a.name }));
              const pos = position.get(x.debt.id);
              return (
                <Card key={x.debt.id} className="overflow-hidden">
                  <div className="grid gap-4 p-5 md:grid-cols-[1.4fr_1fr_1fr_1.3fr] md:items-center">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-ink">
                        {x.debt.name}
                        {pos !== undefined && recommended && <Badge>{pos}.º en {short[recommended.strategy]}</Badge>}
                        {x.debt.daysPastDue > 0 && <Badge tone="neg">En mora · {x.debt.daysPastDue} días</Badge>}
                        {x.debt.status === "paused" && <Badge tone="warn">En pausa</Badge>}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {DEBT_TYPE_LABELS[x.debt.type]}
                        {x.debt.creditor ? ` · ${x.debt.creditor}` : ""}
                        {x.debt.paymentDay ? ` · paga el día ${x.debt.paymentDay}` : ""}
                      </p>
                      {x.debt.openingBalance > 0 && (
                        <div className="mt-2">
                          <Meter value={x.principalPaid} max={x.debt.openingBalance} tone="pos" size="sm" label={`Capital pagado de ${x.debt.name}`} />
                          <p className="mt-1 text-xs text-muted">
                            Capital abonado: {f.money(x.principalPaid, x.debt.currency)} de {f.money(x.debt.openingBalance, x.debt.currency)}
                          </p>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted">Saldo pendiente</p>
                      <p className="t-kpi text-ink">{f.money(x.balance, x.debt.currency)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Tasa</p>
                      {x.ea === null ? (
                        <>
                          <p className="inline-flex items-center gap-1 font-semibold text-warn">
                            <AlertTriangle aria-hidden className="size-4" /> Desconocida
                          </p>
                          <p className="text-xs text-muted">Agrégala para estimar</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-ink">{f.pct(x.ea, 2)} E.A.</p>
                          <p className="text-xs text-muted">
                            {f.pct(x.monthlyRate, 2)} mensual · registrada {x.debt.ratePercent?.replace(/\.?0+$/, "")} % {RATE_BASIS_LABELS[x.debt.rateBasis as RateBasis]}
                          </p>
                        </>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted">Cuota mínima · solo con ella</p>
                      <p className="font-semibold text-ink tabular">{x.debt.minimumPayment ? f.money(x.debt.minimumPayment, x.debt.currency) : <span className="text-warn">Sin registrar</span>}</p>
                      <p className="text-xs text-muted">
                        {sim === null
                          ? "Faltan datos para estimar"
                          : sim.status === "never"
                            ? "La cuota no cubre los intereses"
                            : sim.status === "paid_off"
                              ? `${sim.months} meses (${monthShort(sim.months)}) · intereses ≈ ${f.money(sim.totalInterest, x.debt.currency)}`
                              : "Más de 50 años"}
                      </p>
                    </div>
                  </div>
                  <details className="group border-t border-border">
                    <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-end gap-2 px-5 py-2">
                      <span className={buttonClass("secondary", "sm", "group-open:hidden")}>Registrar pago</span>
                      <span className={buttonClass("secondary", "sm", "hidden group-open:inline-flex")}>Cerrar</span>
                      <Link href={`/universidad/finanzas/deudas/${x.debt.id}`} className={buttonClass("ghost", "sm")}>
                        <Pencil aria-hidden className="size-3.5" /> Editar
                      </Link>
                    </summary>
                    <div className="bg-surface-2 p-5">
                      <PaymentForm debtId={x.debt.id} currency={x.debt.currency} accounts={accounts} today={d.today} suggested={x.debt.minimumPayment ? toInputString(x.debt.minimumPayment, x.debt.currency) : ""} />
                      {x.payments.length > 0 && (
                        <details className="mt-4">
                          <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-semibold text-ink">Historial de pagos ({x.payments.length})</summary>
                          <ul className="mt-2 divide-y divide-border">
                            {x.payments.map((p) => (
                              <li key={p.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                                <span>
                                  {f.date(p.paidOn)} · {f.money(p.amount, x.debt.currency)}
                                  <span className="block text-muted">
                                    Capital {f.money(p.principal, x.debt.currency)} · intereses {f.money(p.interest, x.debt.currency)}
                                    {p.interestEstimated && " (estimados)"}
                                    {p.fees ? ` · cargos ${f.money(p.fees, x.debt.currency)}` : ""}
                                  </span>
                                </span>
                                <ConfirmAction
                                  action={deletePaymentAction}
                                  fields={{ id: p.id }}
                                  label={<span className="sr-only">Eliminar pago</span>}
                                  icon={<Trash2 aria-hidden className="size-3.5" />}
                                  title="Eliminar pago"
                                  description="Se eliminará el pago de la deuda y el gasto asociado en tu cuenta."
                                  confirmLabel="Eliminar"
                                />
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
          {list.some((x) => x.debt.status === "paid_off") && (
            <Card>
              <CardHeader title="Deudas pagadas" />
              <ul className="divide-y divide-border">
                {list
                  .filter((x) => x.debt.status === "paid_off")
                  .map((x) => (
                    <li key={x.debt.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
                      <span className="inline-flex items-center gap-2">
                        {x.debt.name} <Badge tone="pos">Pagada</Badge>
                      </span>
                      <span className="text-muted">Intereses pagados registrados: {f.money(x.interestPaid, x.debt.currency)}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </>
  );
}
