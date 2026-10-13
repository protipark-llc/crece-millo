import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, PieChart, Trash2 } from "lucide-react";
import { financePage, first } from "@/server/page-data";
import { getBudgetForMonth, previousBudgetMonth } from "@/server/services/budgets";
import { categoryLabel } from "@/server/services/categories";
import { cashflowEstimates, monthlyReferences } from "@/server/services/finance-data";
import { computeBudget, BUDGET_TEMPLATES } from "@/lib/finance/budget";
import { addMonthsClamped, monthFromKey, monthStart } from "@/lib/finance/dates";
import { toInputString } from "@/lib/money/money";
import { Alert, Badge, Card, CardHeader, EmptyState, InfoTip, Meter, PageHeader, Stat, Table, buttonClass, td, tdNum, th, thNum } from "@/components/ui/primitives";
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
        title="Presupuesto"
        description="Un plan para tu dinero del mes. No es dinero disponible: compáralo con lo que realmente pasa y ajústalo sin culpa."
        actions={
          <nav aria-label="Cambiar de mes" className="flex items-center gap-1">
            <Link href={`?mes=${prevMonth}`} className={buttonClass("secondary", "sm")} aria-label="Mes anterior">
              <ChevronLeft aria-hidden className="size-4" />
            </Link>
            <span className="inline-block min-w-36 text-center text-sm font-medium text-ink first-letter:uppercase">{f.month(month)}</span>
            <Link href={`?mes=${nextMonth}`} className={buttonClass("secondary", "sm")} aria-label="Mes siguiente">
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
                <li key={t.name} className="rounded-lg bg-surface-2 p-3">
                  <p className="font-medium text-ink">{t.name}</p>
                  <p className="mt-1 text-ink-2">{t.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {row.budget.approvedAt ? <Badge tone="pos">Aprobado</Badge> : <Badge tone="warn">Borrador</Badge>}
            {summary.overLimitCount > 0 && <Badge tone="neg">{summary.overLimitCount} categoría(s) excedida(s)</Badge>}
          </div>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Ingreso esperado" value={f.money(summary.expectedIncome, currency)} sub={`Recibido: ${f.money(summary.actualIncome, currency)}`} help="Lo que planeas recibir este mes. Si no lo defines, se usa lo recibido más lo previsto." />
            <Stat label="Gastos presupuestados" value={f.money(summary.totalPlanned, currency)} sub={`Ejecutado: ${f.money(summary.totalExecuted, currency)} (${f.pct(summary.executionPct)})`} />
            <Stat label="Meta de ahorro" value={f.money(summary.savingsTarget, currency)} sub={`Ahorro real a la fecha: ${f.money(summary.actualSavings, currency)}`} help="Ahorro real = ingresos recibidos − gastos pagados del mes." />
            <Stat
              label="Sin asignar"
              value={f.money(summary.unassigned, currency)}
              tone={summary.unassigned < 0 ? "neg" : undefined}
              sub={summary.unassigned < 0 ? "Planeas más de lo que esperas recibir" : "Ingreso − gastos − ahorro"}
              help="En un presupuesto base cero, esta cifra debería llegar a cero: cada peso tiene una tarea."
            />
          </div>
          {summary.unbudgeted.executed > 0 && (
            <Alert tone="warn" className="mb-6" title="Gastos sin presupuesto">
              Hay {f.money(summary.unbudgeted.executed, currency)} en gastos de categorías sin línea en este presupuesto. Agrega esas categorías para comparar mejor.
            </Alert>
          )}
          <Card className="mb-6">
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
                    return (
                      <tr key={l.lineId}>
                        <td className={td}>
                          <p className="font-medium">{label(l.categoryId)}</p>
                          {dbLine?.annualAmount ? <p className="text-xs text-muted">Anual {f.money(dbLine.annualAmount, currency)} ÷ 12</p> : null}
                          <div className="mt-1.5 w-40 max-w-full">
                            <Meter value={l.executed} max={l.planned} tone={l.overLimit ? "neg" : l.projectedOverLimit ? "warn" : "brand"} label={`Ejecución de ${label(l.categoryId)}`} />
                          </div>
                          <p className="mt-0.5 text-xs text-muted">{l.executionPct === null ? "Sin monto asignado" : `${f.pct(l.executionPct, 0)} ejecutado`}</p>
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
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Agregar o actualizar una línea" description="Para gastos anuales u ocasionales, indica el valor anual: se reserva una doceava parte cada mes." />
              <div className="p-5">
                <BudgetLineForm budgetId={row.budget.id} currency={currency} categories={expenseCats} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Reasignar dinero" description="Mueve presupuesto de una categoría a otra sin cambiar el total." />
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
              <div className="space-y-2 p-5 text-sm">
                {summary.expectedIncome > 0 ? (
                  <>
                    <p className="flex justify-between">
                      <span className="text-ink-2">Esenciales</span>
                      <span className="tabular">
                        {f.money(plannedEssential, currency)} · {f.pct(plannedEssential / summary.expectedIncome, 0)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-ink-2">Discrecionales</span>
                      <span className="tabular">
                        {f.money(plannedDiscretionary, currency)} · {f.pct(plannedDiscretionary / summary.expectedIncome, 0)}
                      </span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-ink-2">Ahorro</span>
                      <span className="tabular">
                        {f.money(summary.savingsTarget, currency)} · {f.pct(summary.savingsTarget / summary.expectedIncome, 0)}
                      </span>
                    </p>
                    <p className="pt-2 text-xs text-muted">Como referencia, la regla 50/30/20 propone 50 % necesidades, 30 % deseos y 20 % ahorro. Con ingresos ajustados es normal que lo esencial pese más.</p>
                  </>
                ) : (
                  <p className="text-ink-2">Define el ingreso esperado para ver los porcentajes.</p>
                )}
              </div>
            </Card>
            <Card>
              <CardHeader title="Ajustes del presupuesto" />
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
        </>
      )}
    </>
  );
}
