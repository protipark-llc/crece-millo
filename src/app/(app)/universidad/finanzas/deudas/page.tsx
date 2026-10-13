import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { financePage, first } from "@/server/page-data";
import { debtSummaries, debtsForPlan, monthlyReferences } from "@/server/services/finance-data";
import { DEBT_TYPE_LABELS } from "@/server/services/planning";
import { amortize, RATE_BASIS_LABELS, simulatePayoff, STRATEGY_LABELS, type RateBasis, type Strategy } from "@/lib/finance/debt";
import { addMonthsClamped } from "@/lib/finance/dates";
import { parseAmount, toInputString } from "@/lib/money/money";
import { Alert, Badge, ButtonLink, Card, CardHeader, EmptyState, Meter, PageHeader, Stat, Table, buttonClass, td, tdNum, th, thNum } from "@/components/ui/primitives";
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
  const colors = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
  return (
    <>
      <PageHeader
        title="Deudas y obligaciones"
        description="Conoce el costo real de cada deuda y compara estrategias para salir de ellas. Los resultados son estimaciones educativas, no garantías."
        actions={
          <ButtonLink href="/universidad/finanzas/deudas/nueva">
            <Plus aria-hidden className="size-4" /> Registrar deuda
          </ButtonLink>
        }
      />
      {list.length === 0 ? (
        <Card>
          <EmptyState icon={<CreditCard className="size-6" />} title="No tienes deudas registradas">
            Incluye tarjetas, créditos, préstamos familiares o con tu empresa. Saber exactamente cuánto debes y a qué tasa es el primer paso para pagar menos intereses.
          </EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Deuda total" value={f.money(totalDebt)} />
            <Stat label="Cuotas mínimas al mes" value={f.money(totalMin)} sub={refs.income ? `${f.pct(totalMin / refs.income)} de tu ingreso mensual` : "Registra ingresos para comparar"} />
            <Stat label="Tasa promedio ponderada" value={weightedEa === null ? "—" : `${f.pct(weightedEa)} E.A.`} help="Promedio de las tasas efectivas anuales conocidas, ponderado por saldo." />
            <Stat label="Intereses pagados registrados" value={f.money(list.reduce((s, x) => s + x.interestPaid, 0))} />
          </div>

          <div className="mb-6 space-y-4">
            {active.map((x) => {
              const sim = x.monthlyRate !== null && x.debt.minimumPayment ? amortize(x.balance, x.monthlyRate, x.debt.minimumPayment, x.debt.monthlyFees) : null;
              const accounts = d.accountRows.filter((a) => !a.archivedAt && a.currency === x.debt.currency).map((a) => ({ id: a.id, name: a.name }));
              return (
                <Card key={x.debt.id}>
                  <CardHeader
                    title={
                      <span className="flex flex-wrap items-center gap-2">
                        {x.debt.name}
                        {x.debt.daysPastDue > 0 && <Badge tone="neg">En mora · {x.debt.daysPastDue} días</Badge>}
                        {x.debt.status === "paused" && <Badge tone="warn">En pausa</Badge>}
                      </span>
                    }
                    description={`${DEBT_TYPE_LABELS[x.debt.type]}${x.debt.creditor ? ` · ${x.debt.creditor}` : ""}${x.debt.paymentDay ? ` · paga el día ${x.debt.paymentDay}` : ""}`}
                    actions={
                      <Link href={`/universidad/finanzas/deudas/${x.debt.id}`} className={buttonClass("ghost", "sm")}>
                        <Pencil aria-hidden className="size-3.5" /> Editar
                      </Link>
                    }
                  />
                  <div className="grid gap-5 p-5 lg:grid-cols-2">
                    <div className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-muted">Saldo pendiente</p>
                          <p className="text-lg font-semibold tabular">{f.money(x.balance, x.debt.currency)}</p>
                        </div>
                        <div>
                          <p className="text-muted">Tasa</p>
                          <p className="font-medium">
                            {x.ea === null ? (
                              <span className="text-warn">Desconocida</span>
                            ) : (
                              <>
                                {f.pct(x.ea, 2)} E.A.
                                <span className="block text-xs font-normal text-muted">
                                  Registrada: {x.debt.ratePercent?.replace(/\.?0+$/, "")} % {RATE_BASIS_LABELS[x.debt.rateBasis as RateBasis]} · {f.pct(x.monthlyRate, 2)} mensual
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted">Cuota mínima</p>
                          <p className="font-medium tabular">{x.debt.minimumPayment ? f.money(x.debt.minimumPayment, x.debt.currency) : <span className="text-warn">Sin registrar</span>}</p>
                        </div>
                        <div>
                          <p className="text-muted">Con solo la cuota mínima</p>
                          <p className="font-medium">
                            {sim === null
                              ? "Faltan datos para estimar"
                              : sim.status === "never"
                                ? <span className="text-neg">La cuota no cubre los intereses</span>
                                : sim.status === "paid_off"
                                  ? `${sim.months} meses (≈ ${f.month(addMonthsClamped(d.today, sim.months, 1))}) · intereses ≈ ${f.money(sim.totalInterest, x.debt.currency)}`
                                  : "Más de 50 años"}
                          </p>
                        </div>
                      </div>
                      {x.debt.openingBalance > 0 && (
                        <div>
                          <Meter value={x.principalPaid} max={x.debt.openingBalance} tone="pos" label={`Capital pagado de ${x.debt.name}`} />
                          <p className="mt-1 text-xs text-muted">
                            Capital abonado desde {f.date(x.debt.balanceDate)}: {f.money(x.principalPaid, x.debt.currency)} de {f.money(x.debt.openingBalance, x.debt.currency)}
                          </p>
                        </div>
                      )}
                      {x.payments.length > 0 && (
                        <details>
                          <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">Historial de pagos ({x.payments.length})</summary>
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
                    <div className="rounded-lg bg-surface-2 p-4">
                      <p className="mb-3 text-sm font-medium text-ink">Registrar un pago</p>
                      <PaymentForm debtId={x.debt.id} currency={x.debt.currency} accounts={accounts} today={d.today} suggested={x.debt.minimumPayment ? toInputString(x.debt.minimumPayment, x.debt.currency) : ""} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="mb-6">
            <CardHeader
              title="Comparar estrategias de pago"
              description="Presupuesto mensual = suma de cuotas mínimas + abono extra. Cuando terminas una deuda, su cuota pasa a la siguiente."
            />
            <form method="get" className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted">Abono extra mensual ({d.base})</span>
                <input name="extra" defaultValue={extra ? toInputString(extra, d.base) : ""} inputMode="decimal" placeholder="0" className="h-9 w-40 rounded-lg border border-border-strong bg-surface px-2 tabular" />
              </label>
              <button className={buttonClass("secondary", "sm", "h-9")}>Comparar</button>
            </form>
            {results.length > 0 && baseline ? (
              <>
                <Table caption="Comparación de estrategias">
                  <thead>
                    <tr>
                      <th className={th}>Estrategia</th>
                      <th className={thNum}>Pago mensual</th>
                      <th className={thNum}>Tiempo</th>
                      <th className={thNum}>Intereses estimados</th>
                      <th className={thNum}>Ahorro vs. mínimos</th>
                      <th className={th}>Orden de pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr key={r.strategy}>
                        <td className={td}>{STRATEGY_LABELS[r.strategy]}</td>
                        <td className={tdNum}>{f.money(r.monthlyBudget)}</td>
                        <td className={tdNum}>{r.months === null ? "No se completa" : `${r.months} meses`}</td>
                        <td className={tdNum}>{r.feasible ? f.money(r.totalInterest) : "—"}</td>
                        <td className={`${tdNum} text-pos`}>{r.strategy !== "minimum" && r.feasible && baseline.feasible ? f.money(baseline.totalInterest - r.totalInterest) : "—"}</td>
                        <td className={`${td} text-xs text-ink-2`}>{r.payoffOrder.map((o) => o.name).join(" → ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="px-3 py-4 sm:px-5">
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
                {[...new Set(results.flatMap((r) => r.warnings))].map((w) => (
                  <Alert key={w} tone="warn" className="mx-5 mb-3">
                    {w}
                  </Alert>
                ))}
                <p className="px-5 pb-5 text-xs text-muted">
                  Avalancha minimiza intereses; bola de nieve da victorias tempranas que ayudan a sostener el hábito. Ambas funcionan si las mantienes. Supone tasas constantes y que no adquieres nuevas deudas.
                </p>
              </>
            ) : (
              <p className="px-5 py-6 text-sm text-ink-2">Registra deudas activas con su cuota mínima para comparar estrategias.</p>
            )}
          </Card>
          {list.some((x) => x.debt.status === "paid_off") && (
            <Card>
              <CardHeader title="Deudas pagadas" />
              <ul className="divide-y divide-border">
                {list
                  .filter((x) => x.debt.status === "paid_off")
                  .map((x) => (
                    <li key={x.debt.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <span>
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
