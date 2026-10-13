import type { Metadata } from "next";
import Link from "next/link";
import { Pencil, Plus, Target, Trash2 } from "lucide-react";
import { financePage } from "@/server/page-data";
import { goalsSummary, liquidBalance, monthlyReferences } from "@/server/services/finance-data";
import { GOAL_TYPE_LABELS } from "@/server/services/planning";
import { goalProgress, goalScenarios, suggestedEmergencyMonths, coverageMonths } from "@/lib/finance/goals";
import { Alert, Badge, ButtonLink, Card, CardHeader, EmptyState, Meter, PageHeader, Stat, buttonClass } from "@/components/ui/primitives";
import { ConfirmAction, InlineAction } from "@/components/ui/form";
import { ContributionForm } from "@/components/finance/forms/goal-forms";
import { deleteContributionAction, goalStatusAction } from "../actions";

export const metadata: Metadata = { title: "Ahorro y objetivos" };

export default async function GoalsPage() {
  const { d, f, g, cash, refs } = await financePage(({ d, f }) => ({ d, f, g: goalsSummary(d), cash: liquidBalance(d), refs: monthlyReferences(d) }));
  const available = cash - g.committed;
  const sugg = suggestedEmergencyMonths({
    stability: d.settings.incomeStability,
    dependents: d.settings.dependentsCount ?? 0,
    singleIncome: !!d.settings.singleIncomeHousehold,
  });
  const coverage = g.emergencyFund !== null && refs.essential ? coverageMonths(g.emergencyFund, refs.essential) : null;
  const visible = d.goalRows.filter((x) => x.goal.status !== "archived");
  return (
    <>
      <PageHeader
        title="Ahorro y objetivos"
        description="Ponle nombre, monto y fecha a lo que quieres lograr. Los aportes asignan dinero que ya tienes: no mueven saldo entre cuentas."
        actions={
          <ButtonLink href="/universidad/finanzas/objetivos/nuevo">
            <Plus aria-hidden className="size-4" /> Nuevo objetivo
          </ButtonLink>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Caja disponible" value={f.money(cash)} help="Saldo registrado de tus cuentas líquidas." />
        <Stat label="Comprometido en objetivos" value={f.money(g.committed)} help="Suma de lo acumulado en tus objetivos: dinero que ya tiene un destino." />
        <Stat label="Disponible sin comprometer" value={f.money(available)} tone={available < 0 ? "neg" : undefined} help="Caja − dinero comprometido. Lo que puedes usar sin afectar tus metas." />
        <Stat label="Cobertura de emergencia" value={coverage === null ? "—" : f.months(coverage)} sub={refs.essential ? `Gasto esencial: ${f.money(refs.essential)}/mes` : "Faltan gastos esenciales registrados"} />
      </div>
      {available < 0 && (
        <Alert tone="warn" className="mb-6" title="Has comprometido más dinero del que tienes en caja">
          Puede ser normal si parte del ahorro está en cuentas de inversión. Si no, revisa los aportes registrados o tus saldos.
        </Alert>
      )}
      <Card className="mb-6">
        <CardHeader title="¿Cuántos meses debería cubrir mi fondo de emergencia?" description="No hay una cifra universal. Este es el criterio que usamos con tus datos del diagnóstico; ajústalo a tu realidad." />
        <div className="grid gap-4 p-5 text-sm sm:grid-cols-[auto_1fr]">
          <div className="rounded-lg bg-brand-soft px-5 py-4 text-center">
            <p className="text-3xl font-semibold text-brand">{sugg.months}</p>
            <p className="text-xs text-brand">meses sugeridos</p>
          </div>
          <ul className="list-disc space-y-1 pl-5 text-ink-2">
            {sugg.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
            <li>
              Puedes actualizar tu situación en el{" "}
              <Link href="/universidad/finanzas/diagnostico" className="text-brand hover:underline">
                diagnóstico
              </Link>
              .
            </li>
          </ul>
        </div>
      </Card>
      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={<Target className="size-6" />} title="Aún no tienes objetivos" action={<ButtonLink href="/universidad/finanzas/objetivos/nuevo">Crear mi primer objetivo</ButtonLink>}>
            Empieza por un fondo de emergencia: es la base que evita que un imprevisto se convierta en deuda.
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map(({ goal, accumulated, contributions }) => {
            const p = goalProgress({ target: goal.targetAmount, accumulated, targetDate: goal.targetDate, today: d.today, plannedMonthly: goal.plannedMonthly });
            const scen = p.monthsLeft && p.monthsLeft > 0 && p.missing > 0 ? goalScenarios(goal.targetAmount, accumulated, p.monthsLeft) : [];
            return (
              <Card key={goal.id}>
                <CardHeader
                  title={
                    <span className="flex flex-wrap items-center gap-2">
                      {goal.name}
                      <Badge>{GOAL_TYPE_LABELS[goal.type]}</Badge>
                      <Badge tone="neutral">Prioridad {goal.priority}</Badge>
                      {goal.status === "achieved" && <Badge tone="pos">Alcanzado</Badge>}
                      {goal.status === "paused" && <Badge tone="warn">En pausa</Badge>}
                      {goal.status === "active" && p.onTrack === true && <Badge tone="pos">Al día</Badge>}
                      {goal.status === "active" && p.onTrack === false && <Badge tone="warn">Requiere más aporte</Badge>}
                    </span>
                  }
                  actions={
                    <>
                      <Link href={`/universidad/finanzas/objetivos/${goal.id}`} className={buttonClass("ghost", "sm")}>
                        <Pencil aria-hidden className="size-3.5" /> Editar
                      </Link>
                      {goal.status === "active" ? (
                        <InlineAction action={goalStatusAction} fields={{ id: goal.id, status: "paused" }}>
                          Pausar
                        </InlineAction>
                      ) : (
                        <InlineAction action={goalStatusAction} fields={{ id: goal.id, status: "active" }}>
                          Reactivar
                        </InlineAction>
                      )}
                      <InlineAction action={goalStatusAction} fields={{ id: goal.id, status: "archived" }}>
                        Archivar
                      </InlineAction>
                    </>
                  }
                />
                <div className="grid gap-5 p-5 lg:grid-cols-2">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-baseline justify-between">
                      <span className="text-lg font-semibold tabular">{f.money(accumulated, goal.currency)}</span>
                      <span className="text-muted">de {f.money(goal.targetAmount, goal.currency)}</span>
                    </div>
                    <Meter value={accumulated} max={goal.targetAmount} tone={goal.status === "achieved" ? "pos" : "brand"} label={`Progreso de ${goal.name}`} />
                    <dl className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-muted">Falta</dt>
                        <dd className="tabular">{f.money(p.missing, goal.currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Fecha deseada</dt>
                        <dd>{goal.targetDate ? `${f.date(goal.targetDate)} (${p.monthsLeft} meses)` : "Sin fecha"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Aporte mensual necesario</dt>
                        <dd className="tabular">{p.requiredMonthly === null ? (goal.targetDate ? "Plazo vencido" : "Define una fecha") : f.money(p.requiredMonthly, goal.currency)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Aporte planeado</dt>
                        <dd className="tabular">
                          {goal.plannedMonthly ? f.money(goal.plannedMonthly, goal.currency) : "—"}
                          {p.monthsAtPlannedPace !== null && p.missing > 0 && <span className="block text-xs text-muted">A este ritmo: {p.monthsAtPlannedPace} meses</span>}
                        </dd>
                      </div>
                    </dl>
                    {scen.length > 0 && (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">¿Y si cambio el plazo o la meta?</summary>
                        <ul className="mt-2 space-y-1 text-xs">
                          {scen.map((s) => (
                            <li key={s.label} className="flex justify-between gap-2">
                              <span className="text-ink-2">
                                {s.label} ({s.months} meses, meta {f.money(s.target, goal.currency)})
                              </span>
                              <span className="tabular">{s.monthly === null ? "—" : `${f.money(s.monthly, goal.currency)}/mes`}</span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-2 text-xs text-muted">Cálculo sin rendimientos: no suponemos ganancias que no están garantizadas.</p>
                      </details>
                    )}
                  </div>
                  <div className="space-y-3">
                    {goal.status !== "achieved" && (
                      <div className="rounded-md bg-surface-2 p-4">
                        <ContributionForm goalId={goal.id} currency={goal.currency} today={d.today} />
                      </div>
                    )}
                    {contributions.length > 0 && (
                      <details>
                        <summary className="cursor-pointer text-xs font-medium text-muted hover:text-ink">Historial ({contributions.length})</summary>
                        <ul className="mt-2 divide-y divide-border text-xs">
                          {contributions.map((c) => (
                            <li key={c.id} className="flex items-center justify-between py-1.5">
                              <span>
                                {f.date(c.contributedOn)} · <span className={c.amount < 0 ? "text-neg" : "text-pos"}>{f.signed(c.amount, goal.currency)}</span>
                                {c.note && <span className="text-muted"> · {c.note}</span>}
                              </span>
                              <ConfirmAction
                                action={deleteContributionAction}
                                fields={{ id: c.id }}
                                label={<span className="sr-only">Eliminar aporte</span>}
                                icon={<Trash2 aria-hidden className="size-3.5" />}
                                title="Eliminar registro"
                                description="Se eliminará este aporte o retiro del objetivo."
                                confirmLabel="Eliminar"
                              />
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
