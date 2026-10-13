import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ChevronLeft, ChevronRight, PieChart, Trash2 } from "lucide-react";
import { financePage, first } from "@/server/page-data";
import { getBudgetForMonth, previousBudgetMonth } from "@/server/services/budgets";
import { categoryLabel } from "@/server/services/categories";
import { cashflowEstimates, monthlyReferences } from "@/server/services/finance-data";
import { computeBudget, BUDGET_TEMPLATES } from "@/lib/finance/budget";
import { addMonthsClamped, daysInMonth, monthFromKey, monthStart, parts } from "@/lib/finance/dates";
import { toInputString } from "@/lib/money/money";
import { Alert, Badge, Card, CardHeader, EmptyState, InfoTip, Meter, PageHeader, Table, buttonClass, td, tdNum, th, thNum } from "@/components/ui/primitives";
import { LineStatusText, budgetLineStatus } from "@/components/finance/budget-status";
import { cn } from "@/components/ui/cn";
import { ConfirmAction } from "@/components/ui/form";
import { BudgetLineForm, BudgetMetaForm, CreateBudgetForm, ReallocateForm } from "@/components/finance/forms/budget-forms";
import { deleteBudgetLineAction } from "../actions";

export const metadata: Metadata = { title: "Presupuesto" };

export default async function BudgetPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const data = await financePage(async ({ d, f, tx, userId }) => {
    let month = monthStart(d.today);
    try {
      const m = first(params.mes);
      if (m) month = monthFromKey(m);
    } catch {
      /* mes inválido → mes actual */
    }
    const row = await getBudgetForMonth(tx, userId, month);
    const prev = await previousBudgetMonth(tx, userId, month);
    const refs = monthlyReferences(d);
    const debtsCat = d.categoryRows.find((c) => c.systemKey === "debts")?.id ?? null;
    const externalCommitted = cashflowEstimates(d)
      .debtPayments.filter((p) => p.date.slice(0, 7) === month.slice(0, 7))
      .map((p) => ({ categoryId: debtsCat, amount: p.amount }));
    const summary = row
      ? computeBudget({
          month,
          today: d.today,
          lines: row.lines.map((l) => ({ id: l.id, categoryId: l.categoryId, planned: l.planned })),
          categories: d.categories,
          txs: d.txs,
          rules: d.rules,
          baseCurrency: row.budget.currency,
          rates: d.rates,
          expectedIncome: row.budget.expectedIncome,
          savingsTarget: row.budget.savingsTarget,
          externalCommitted,
        })
      : null;
    return { d, f, month, row, prev, refs, summary };
  });
  const { d, f, month, row, prev, refs, summary } = data;
  const prevMonth = addMonthsClamped(month, -1, 1).slice(0, 7);
  const nextMonth = addMonthsClamped(month, 1, 1).slice(0, 7);
  const currency = row?.budget.currency ?? d.base;
  const curMonth = monthStart(d.today);
  const monthPct = month < curMonth ? 1 : month > curMonth ? 0 : parts(d.today).d / daysInMonth(parts(d.today).y, parts(d.today).m);
  const label = (id: string | null) => categoryLabel(d.categoryRows, id);
  const natureOf = (id: string | null) => {
    let c = d.categoryRows.find((x) => x.id === id);
    while (c) {
      if (c.nature) return c.nature;
      c = d.categoryRows.find((x) => x.id === c!.parentId);
    }
    return null;
  };
  const plannedEssential = summary?.lines.filter((l) => natureOf(l.categoryId) === "essential").reduce((s, l) => s + l.planned, 0) ?? 0;
  const plannedDiscretionary = summary?.lines.filter((l) => natureOf(l.categoryId) === "discretionary").reduce((s, l) => s + l.planned, 0) ?? 0;
  const expenseCats = d.categoryRows
    .filter((c) => c.kind === "expense" && !c.archived && (c.systemKey !== "business" || d.settings.businessExpensesEnabled))
    .map((c) => ({ id: c.id, label: c.parentId ? c.name : `${c.name} (general)`, group: c.parentId ? (d.categoryRows.find((p) => p.id === c.parentId)?.name ?? "") : c.name }));
  return (
    <>
      <PageHeader
        eyebrow="Finanzas personales"
        title="Presupuesto"
        description="Un plan para tu dinero del mes. No es dinero disponible: compáralo con lo que pasa y ajústalo sin culpa."
        actions={
          <nav aria-label="Cambiar de mes" className="flex items-center gap-2">
            <Link href={`?mes=${prevMonth}`} className={buttonClass("secondary", "md", "w-11 px-0")} aria-label="Mes anterior">
              <ChevronLeft aria-hidden className="size-4" />
            </Link>
            <span className="inline-block min-w-36 text-center font-semibold text-ink first-letter:uppercase">{f.month(month)}</span>
            <Link href={`?mes=${nextMonth}`} className={buttonClass("secondary", "md", "w-11 px-0")} aria-label="Mes siguiente">
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </nav>
        }
      />
      {!row || !summary ? (
        <Card>
          <EmptyState icon={<PieChart className="size-6" />} title={`No hay presupuesto para ${f.month(month)}`}>
            Crea uno desde cero o copia un mes anterior. Las plantillas son referencias educativas, no reglas: adáptalas a tu realidad.
          </EmptyState>
          <div className="border-t border-border p-5">
            <CreateBudgetForm month={month} currency={d.base} previousMonth={prev} suggestedIncome={refs.income ? toInputString(refs.income, d.base) : ""} />
            <ul className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              {Object.values(BUDGET_TEMPLATES).map((t) => (
                <li key={t.name} className="rounded-md bg-surface-2 p-3">
                  <p className="font-medium text-ink">{t.name}</p>
                  <p className="mt-1 text-ink-2">{t.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : (
        <>
          <Card className="mb-5 p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {row.budget.approvedAt ? <Badge tone="pos">Aprobado</Badge> : <Badge tone="neutral">Borrador</Badge>}
              <span className="text-xs text-muted">
                {row.budget.approvedAt ? "Es tu plan definitivo del mes; puedes seguir ajustándolo." : "Cuando te sientas cómodo con el plan, apruébalo como definitivo del mes (en Ajustes del mes)."}
              </span>
              {summary.overLimitCount > 0 && (
                <Badge tone="neg" className="sm:ml-auto">
                  {summary.overLimitCount} {summary.overLimitCount === 1 ? "categoría excedida" : "categorías excedidas"}
                </Badge>
              )}
            </div>
            <dl className="mt-4 grid grid-cols-1 overflow-hidden rounded-lg border border-border sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-4">
                <dt className="text-[13px] text-muted">Ingreso esperado</dt>
                <dd className="t-kpi mt-1 text-ink">{f.money(summary.expectedIncome, currency)}</dd>
                <dd className="mt-0.5 text-xs text-muted">Recibido hasta hoy: {f.money(summary.actualIncome, currency)}</dd>
              </div>
              <div className="border-t border-border p-4 sm:border-t-0 sm:border-l">
                <dt className="text-[13px] text-muted">Gastos presupuestados</dt>
                <dd className="t-kpi mt-1 text-ink">{f.money(summary.totalPlanned, currency)}</dd>
                <dd className="mt-0.5 text-xs text-muted">
                  Ejecutado {f.money(summary.totalExecuted, currency)} ({f.pct(summary.executionPct)})
                </dd>
              </div>
              <div className="border-t border-border p-4 lg:border-t-0 lg:border-l">
                <dt className="text-[13px] text-muted">Meta de ahorro</dt>
                <dd className="t-kpi mt-1 text-ink">{f.money(summary.savingsTarget, currency)}</dd>
                <dd className="mt-0.5 text-xs text-muted">Ahorro real a la fecha: {f.money(summary.actualSavings, currency)}</dd>
              </div>
              <div className={cn("border-t border-border p-4 sm:border-l lg:border-t-0", summary.unassigned < 0 && "bg-warn-soft")}>
                <dt className="inline-flex items-center gap-1 text-[13px] text-muted">
                  Sin asignar <InfoTip text="Ingreso esperado − gastos presupuestados − meta de ahorro. En un presupuesto base cero debería llegar a cero: cada peso tiene una tarea." />
                </dt>
                <dd className={cn("t-kpi mt-1", summary.unassigned < 0 ? "text-warn" : "text-ink")}>{f.money(summary.unassigned, currency)}</dd>
                <dd className={cn("mt-0.5 text-xs", summary.unassigned < 0 ? "font-semibold text-warn" : "text-muted")}>
                  {summary.unassigned < 0 ? "Planeas más de lo que esperas recibir" : "Ingreso − gastos − ahorro"}
                </dd>
              </div>
            </dl>
            {summary.unassigned < 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-warn-soft px-4 py-3 text-sm text-ink">
                <AlertTriangle aria-hidden className="size-5 shrink-0 text-warn" />
                <p className="min-w-0 flex-1">
                  Planeas <strong className="tabular">{f.money(-summary.unassigned, currency)}</strong> más de lo que esperas recibir. Puedes bajar una línea discrecional, reasignar o revisar la meta de ahorro.
                </p>
                <a href="#reasignar" className="inline-flex min-h-9 items-center font-semibold text-ink hover:underline">
                  Reasignar dinero
                </a>
              </div>
            )}
          </Card>
          {summary.unbudgeted.executed > 0 && (
            <Alert tone="warn" className="mb-5" title="Gastos sin presupuesto">
              Hay {f.money(summary.unbudgeted.executed, currency)} en gastos de categorías sin línea en este presupuesto. Agrega esas categorías para comparar mejor.
            </Alert>
          )}
          <div className="grid gap-5 lg:grid-cols-3">
          <div className="min-w-0 space-y-5 lg:col-span-2">
          <Card>
            <CardHeader
              title="Plan frente a realidad"
              description={`Proyección al cierre: ${f.money(summary.totalProjected, currency)}. Comprometido = previstos pendientes del mes (incluidas recurrencias y cuotas estimadas de deudas).`}
            />
            {summary.lines.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-2">Agrega líneas por categoría con el formulario de abajo.</p>
            ) : (
              <Table caption="Líneas del presupuesto">
                <thead>
                  <tr>
                    <th className={th}>Categoría</th>
                    <th className={thNum}>Presupuesto</th>
                    <th className={thNum}>Ejecutado</th>
                    <th className={thNum}>Comprometido</th>
                    <th className={thNum}>Saldo</th>
                    <th className={thNum}>
                      <span className="inline-flex items-center gap-1">
                        Al cierre <InfoTip text="Fijos: ejecutado + comprometido. Variables: el mayor entre eso y el ritmo diario de gasto × días del mes." />
                      </span>
                    </th>
                    <th className={th}>
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summary.lines.map((l) => {
                    const dbLine = row.lines.find((x) => x.id === l.lineId);
                    const st = budgetLineStatus(l, f, { monthPct, currency });
                    return (
                      <tr key={l.lineId}>
                        <td className={td}>
                          <p className="font-semibold">{label(l.categoryId)}</p>
                          {dbLine?.annualAmount ? <p className="text-xs text-muted">Anual {f.money(dbLine.annualAmount, currency)} ÷ 12</p> : null}
                          <div className="mt-1.5 w-44 max-w-full">
                            <Meter value={l.executed} max={l.planned} tone={st.meter} today={monthPct} label={`Ejecución de ${label(l.categoryId)}`} />
                          </div>
                          <LineStatusText status={st} className="mt-1" />
                        </td>
                        <td className={tdNum}>{f.money(l.planned, currency)}</td>
                        <td className={tdNum}>{f.money(l.executed, currency)}</td>
                        <td className={tdNum}>{f.money(l.committed, currency)}</td>
                        <td className={`${tdNum} ${l.remaining < 0 ? "text-neg" : ""}`}>{f.money(l.remaining, currency)}</td>
                        <td className={`${tdNum} ${l.projectedOverLimit ? "text-warn" : ""}`}>{f.money(l.projectedClose, currency)}</td>
                        <td className={`${td} text-right`}>
                          <ConfirmAction
                            action={deleteBudgetLineAction}
                            fields={{ id: l.lineId! }}
                            label={<span className="sr-only">Quitar línea {label(l.categoryId)}</span>}
                            icon={<Trash2 aria-hidden className="size-3.5" />}
                            title="Quitar línea"
                            description={`Se quitará ${label(l.categoryId)} del presupuesto. Los gastos no se borran.`}
                            confirmLabel="Quitar"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-surface-2/50">
                    <td className={td}>
                      <p className="font-medium">Sin presupuestar</p>
                    </td>
                    <td className={tdNum}>—</td>
                    <td className={tdNum}>{f.money(summary.unbudgeted.executed, currency)}</td>
                    <td className={tdNum}>{f.money(summary.unbudgeted.committed, currency)}</td>
                    <td className={tdNum}>—</td>
                    <td className={tdNum}>{f.money(summary.unbudgeted.projectedClose, currency)}</td>
                    <td className={td} />
                  </tr>
                </tbody>
              </Table>
            )}
          </Card>
            <Card>
              <CardHeader title="Agregar o actualizar una línea" description="Para gastos anuales u ocasionales, indica el valor anual: se reserva una doceava parte cada mes." />
              <div className="p-5">
                <BudgetLineForm budgetId={row.budget.id} currency={currency} categories={expenseCats} />
              </div>
            </Card>
          </div>
          <div className="min-w-0 space-y-5">
            <Card id="reasignar" className="scroll-mt-6">
              <CardHeader title="Reasignar dinero" description="Mueve plan de una categoría a otra sin cambiar el total." />
              <div className="p-5">
                {summary.lines.length >= 2 ? (
                  <ReallocateForm currency={currency} lines={summary.lines.map((l) => ({ id: l.lineId!, label: `${label(l.categoryId)} (${f.money(l.planned, currency)})` }))} />
                ) : (
                  <p className="text-sm text-ink-2">Necesitas al menos dos líneas.</p>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Distribución del plan" description="Referencia, no regla. Compárala con tu realidad." />
              <div className="space-y-3 p-5 text-sm">
                {summary.expectedIncome > 0 ? (
                  <>
                    {(() => {
                      const parts3 = [
                        { key: "ess", label: "Esenciales (incluye deudas)", value: plannedEssential, ref: 0.5, color: "var(--chart-1)" },
                        { key: "dis", label: "Discrecionales", value: plannedDiscretionary, ref: 0.3, color: "var(--chart-2)" },
                        { key: "sav", label: "Ahorro", value: summary.savingsTarget, ref: 0.2, color: "var(--chart-3)" },
                      ];
                      const total = Math.max(summary.expectedIncome, parts3.reduce((a, p) => a + p.value, 0));
                      return (
                        <>
                          <p className="text-xs text-muted">Tu plan (sobre el ingreso esperado)</p>
                          <div aria-hidden className="flex h-3 overflow-hidden rounded-full bg-surface-3">
                            {parts3.map((p) => (
                              <span key={p.key} style={{ width: `${(p.value / total) * 100}%`, background: p.color }} />
                            ))}
                          </div>
                          <p className="text-xs text-muted">Referencia 50/30/20</p>
                          <div aria-hidden className="flex h-3 gap-0.5 overflow-hidden rounded-full opacity-45">
                            {parts3.map((p) => (
                              <span key={p.key} style={{ width: `${p.ref * 100}%`, background: p.color }} />
                            ))}
                          </div>
                          <ul className="space-y-1.5 pt-1">
                            {parts3.map((p) => (
                              <li key={p.key} className="flex items-center justify-between gap-3">
                                <span className="inline-flex items-center gap-2 text-ink">
                                  <span aria-hidden className="size-2.5 rounded-xs" style={{ background: p.color }} />
                                  {p.label}
                                </span>
                                <span className="tabular whitespace-nowrap text-ink">
                                  {f.money(p.value, currency)} · {f.pct(p.value / summary.expectedIncome, 0)}
                                  <span className="text-muted"> (ref. {f.pct(p.ref, 0)})</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </>
                      );
                    })()}
                    <p className="pt-1 text-xs text-muted">Con cuotas de deuda altas es normal que lo esencial pese más. A medida que pagues deudas, esa parte puede pasar a ahorro.</p>
                  </>
                ) : (
                  <p className="text-ink-2">Define el ingreso esperado para ver los porcentajes.</p>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Ajustes del mes" />
              <div className="p-5">
                <BudgetMetaForm
                  currency={currency}
                  budget={{
                    id: row.budget.id,
                    expectedIncome: row.budget.expectedIncome !== null ? toInputString(row.budget.expectedIncome, currency) : "",
                    savingsTarget: toInputString(row.budget.savingsTarget, currency),
                    notes: row.budget.notes ?? "",
                    approved: !!row.budget.approvedAt,
                  }}
                />
              </div>
            </Card>
          </div>
          </div>
        </>
      )}
    </>
  );
}
