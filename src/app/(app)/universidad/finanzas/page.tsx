import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, ChevronDown, Clock, OctagonAlert, Stethoscope } from "lucide-react";
import { financePage } from "@/server/page-data";
import { buildOverview, upcoming } from "@/server/services/dashboard";
import { DIAGNOSTIC_STEPS } from "@/server/services/settings";
import { categoryLabel } from "@/server/services/categories";
import { courseProgress } from "@/server/education-data";
import { daysInMonth, monthStart, parts } from "@/lib/finance/dates";
import { panelHeadline } from "@/lib/finance/headline";
import type { BudgetLineResult } from "@/lib/finance/budget";
import type { Fmt } from "@/server/format";
import { Badge, ButtonLink, Card, Meter, buttonClass } from "@/components/ui/primitives";
import { IndicatorGrid, formatIndicator } from "@/components/finance/indicator-grid";
import { InsightList } from "@/components/finance/insight-list";
import { LineChart } from "@/components/charts/charts";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Panel financiero" };

const MORE_KEYS = ["net_flow", "essential", "discretionary", "budget_execution", "debt_payments", "debt_service_ratio", "emergency_coverage", "net_worth", "net_worth_mom", "net_worth_yoy", "goals"];

/** Estado de una línea de presupuesto, siempre con ícono y texto (entrega §6: «Pagado completo», «Quedan $ X»…). */
function lineStatus(l: BudgetLineResult, f: Fmt, monthPct: number) {
  if (l.overLimit) return { tone: "text-neg", icon: OctagonAlert, text: `Excedido por ${f.money(l.executed - l.planned)}`, meter: "neg" as const };
  if (l.executed >= l.planned) return { tone: "text-pos", icon: Check, text: "Pagado completo", meter: "brand" as const };
  if (l.projectedOverLimit)
    return { tone: "text-warn", icon: AlertTriangle, text: `${f.pct(l.executed / l.planned, 0)} usado con el ${f.pct(monthPct, 0)} del mes`, meter: "warn" as const };
  return { tone: "text-pos", icon: Check, text: `Quedan ${f.money(l.planned - l.executed)}`, meter: "brand" as const };
}

export default async function FinancePanel() {
  const [data, edu] = await Promise.all([
    financePage(async ({ d, tx, userId, f }) => {
      const o = await buildOverview(tx, userId, d);
      const next = upcoming(d, 14).slice(0, 6);
      return { d, o, next, f };
    }),
    courseProgress(),
  ]);
  const { d, o, next, f } = data;
  const doneSteps = d.settings.diagnosticSteps.length;
  const missingSteps = DIAGNOSTIC_STEPS.filter((s) => !d.settings.diagnosticSteps.includes(s.key));
  const { y, m, d: day } = parts(d.today);
  const dim = daysInMonth(y, m);
  const monthPct = day / dim;
  const monthName = f.month(monthStart(d.today));

  const label = (id: string | null) => categoryLabel(d.categoryRows, id);
  const headline = panelHeadline({
    hasAccounts: d.accounts.length > 0,
    firstNegativeDate: o.cash90.firstNegativeDate,
    lines: o.budget ? o.budget.lines.map((l) => ({ label: label(l.categoryId), planned: l.planned, executed: l.executed, overLimit: l.overLimit, projectedOverLimit: l.projectedOverLimit })) : null,
    formatDate: (x) => f.date(x),
    formatPct: (v) => f.pct(v, 0),
    formatMoney: (x) => f.money(x),
  });
  const emphasisTone = headline.tone === "neg" ? "text-neg" : headline.tone === "warn" ? "text-warn" : "text-ink";

  const kpi = (key: string) => o.indicators.find((i) => i.key === key)!;
  const kpis = [
    { i: kpi("cash"), sub: "Hoy, en cuentas disponibles", sign: "" },
    { i: kpi("income"), sub: `${monthName}, hasta hoy`, sign: "+" },
    { i: kpi("expenses"), sub: `${monthName}, hasta hoy`, sign: "−" },
    { i: kpi("savings_rate"), sub: "Lo que no gastaste de lo que entró", sign: "" },
  ];

  const cashLabels = o.cash90.buckets.map((b) => f.date(b.start).replace(/ \d{4}$/, ""));
  const lowIdx = o.cash90.buckets.findIndex((b) => b.closing === o.cash90.lowestBalance);
  const budgetLines = o.budget
    ? o.budget.lines
        .filter((l) => l.planned > 0)
        .slice()
        .sort((a, b) => (b.executionPct ?? 0) - (a.executionPct ?? 0))
        .slice(0, 5)
    : [];
  const nextLesson = edu.next;

  return (
    <>
      <p className="t-overline mb-3 text-muted">Finanzas personales · Panel</p>

      {/* Respuesta principal */}
      <Card className="p-5 sm:p-7">
        <p className="t-overline text-ink">
          {monthName} · día {day} de {dim}
        </p>
        <h1 className="t-answer mt-3 max-w-3xl text-ink">
          {headline.segments.map((s, i) => (
            <span key={i} className={s.emphasis ? emphasisTone : undefined}>
              {s.text}
            </span>
          ))}
        </h1>
        {o.budget && o.budget.executionPct !== null && (
          <p className="mt-3 max-w-2xl text-ink-2">
            Llevas el {f.pct(o.budget.executionPct)} del presupuesto con el {f.pct(monthPct, 0)} del mes.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href="/universidad/finanzas/movimientos/nuevo?tipo=expense">
            <ArrowUpRight aria-hidden className="size-4" /> Gasto
          </ButtonLink>
          <ButtonLink href="/universidad/finanzas/movimientos/nuevo?tipo=income" variant="secondary">
            <ArrowDownLeft aria-hidden className="size-4" /> Ingreso
          </ButtonLink>
          <ButtonLink href="/universidad/finanzas/movimientos/nuevo?tipo=transfer" variant="secondary">
            <ArrowLeftRight aria-hidden className="size-4" /> Transferencia
          </ButtonLink>
        </div>

        <dl className="mt-6 grid grid-cols-2 overflow-hidden rounded-lg border border-border lg:grid-cols-4">
          {kpis.map(({ i, sub, sign }, n) => {
            const missing = i.value === null;
            const tone = missing ? "text-muted" : i.key === "income" && i.value! > 0 ? "text-pos" : i.key === "expenses" && i.value! > 0 ? "text-neg" : "text-ink";
            return (
              <div key={i.key} className={cn("p-4", n % 2 === 1 && "border-l border-border", n >= 2 && "border-t border-border lg:border-t-0", n === 2 && "lg:border-l")}>
                <dt className="text-[13px] text-muted">{i.label}</dt>
                <dd className={cn(missing ? "mt-1 text-sm font-semibold" : "t-kpi mt-1 whitespace-nowrap", tone)}>
                  {!missing && i.value! > 0 && sign}
                  {formatIndicator(i, f)}
                </dd>
                <dd className="mt-0.5 text-xs text-muted">{missing && i.missing ? i.missing : sub}</dd>
              </div>
            );
          })}
        </dl>

        {o.budget && o.budget.totalPlanned > 0 && (
          <div className="mt-5">
            <Meter value={o.budget.totalExecuted} max={o.budget.totalPlanned} today={monthPct} size="lg" label="Presupuesto usado en el mes" />
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-ink-2">
              <span className="tabular">
                Presupuesto usado: {f.money(o.budget.totalExecuted)} de {f.money(o.budget.totalPlanned)} ({f.pct(o.budget.executionPct)})
              </span>
              <span>Línea negra: hoy, {f.pct(monthPct, 0)} del mes</span>
            </div>
          </div>
        )}
      </Card>

      {doneSteps < DIAGNOSTIC_STEPS.length && (
        <div className="mt-5 flex flex-col items-start gap-3 rounded-lg bg-surface-3/60 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
          <Stethoscope aria-hidden className="hidden size-5 shrink-0 text-ink sm:block" />
          <p className="min-w-0 flex-1 text-sm text-ink">
            <strong className="font-semibold">
              Diagnóstico: {doneSteps} de {DIAGNOSTIC_STEPS.length} pasos.
            </strong>{" "}
            Con {missingSteps.length === 1 ? "el que falta" : `los ${missingSteps.length} que faltan`} ({missingSteps.map((s) => s.label.toLowerCase()).join(", ")}) podemos
            calcular tu cobertura y tu plan con más fiabilidad.
          </p>
          <ButtonLink href="/universidad/finanzas/diagnostico">Continuar diagnóstico</ButtonLink>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="t-section text-ink">Tu caja en los próximos 90 días</h2>
            <Link href="/universidad/finanzas/flujo-de-caja" className="inline-flex min-h-9 items-center text-sm font-semibold text-ink hover:underline">
              Ver flujo de caja
            </Link>
          </div>
          {d.accounts.length ? (
            <>
              <p className="mt-2 text-ink-2">
                {o.cash90.firstNegativeDate ? (
                  <>
                    Tu caja podría quedar en negativo el <strong className="text-neg">{f.date(o.cash90.firstNegativeDate)}</strong>. Revisa qué pagos coinciden esa semana.
                  </>
                ) : (
                  <>
                    El punto más bajo llega el <strong className="text-ink">{f.date(o.cash90.lowestBalanceDate)}</strong>, con{" "}
                    <strong className="tabular text-ink">{f.money(o.cash90.lowestBalance)}</strong>. No hay déficit previsto.
                  </>
                )}
              </p>
              <div className="mt-4">
                <LineChart
                  title="Saldo de caja proyectado por semana"
                  labels={cashLabels}
                  series={[{ key: "bal", label: "Saldo al cierre de la semana", color: "var(--chart-1)", values: o.cash90.buckets.map((b) => b.closing) }]}
                  currency={d.base}
                  locale={d.locale}
                  projectedFrom={0}
                  todayIndex={0}
                  mark={lowIdx >= 0 ? { index: lowIdx, label: f.money(o.cash90.lowestBalance) } : null}
                />
              </div>
            </>
          ) : (
            <p className="py-10 text-center text-sm text-ink-2">
              Registra al menos una cuenta para ver tu caja.{" "}
              <Link className="font-semibold text-ink underline" href="/universidad/finanzas/cuentas">
                Crear cuenta
              </Link>
            </p>
          )}
        </Card>
        <Card>
          <div className="px-5 pt-5">
            <h2 className="t-section text-ink">Qué puedes hacer</h2>
            <p className="mt-1 text-xs text-muted">Reglas transparentes sobre tus datos, no un modelo de IA.</p>
          </div>
          <InsightList insights={o.insights} limit={3} />
        </Card>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">Próximos 14 días</h2>
            <Link href="/universidad/finanzas/movimientos" className="inline-flex min-h-9 items-center text-sm font-semibold text-ink hover:underline">
              Movimientos
            </Link>
          </div>
          {next.length ? (
            <ul className="mt-2 divide-y divide-border">
              {next.map((u) => (
                <li key={u.key} className="flex items-start gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">{u.description}</p>
                    <p className="text-xs text-muted">
                      {f.date(u.date)} · {u.kind === "transfer" ? "Transferencia" : label(u.categoryId)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={cn("tabular font-semibold whitespace-nowrap", u.kind === "income" ? "text-pos" : u.kind === "expense" ? "text-neg" : "text-ink")}>
                      {u.kind === "income" ? "+" : u.kind === "expense" ? "−" : ""}
                      {f.money(u.amount, u.currency)}
                    </span>
                    {u.overdue ? (
                      <Badge tone="warn">
                        <AlertTriangle aria-hidden className="size-3" /> Por confirmar
                      </Badge>
                    ) : (
                      <Badge tone="info">
                        <Clock aria-hidden className="size-3" /> Previsto
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-2">No hay pagos ni ingresos previstos en las próximas dos semanas.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">Presupuesto del mes</h2>
            <Link href="/universidad/finanzas/presupuesto" className="inline-flex min-h-9 items-center text-sm font-semibold text-ink hover:underline">
              {o.budget ? "Ver detalle" : "Crear"}
            </Link>
          </div>
          {budgetLines.length ? (
            <ul className="mt-3 space-y-4">
              {budgetLines.map((l) => {
                const st = lineStatus(l, f, monthPct);
                const Icon = st.icon;
                return (
                  <li key={l.lineId}>
                    <div className="mb-1.5 flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate text-ink">{label(l.categoryId)}</span>
                      <span className="tabular whitespace-nowrap text-ink">
                        {f.money(l.executed)} / {f.money(l.planned)}
                      </span>
                    </div>
                    <Meter value={l.executed} max={l.planned} tone={st.meter} label={label(l.categoryId)} />
                    <p className={cn("mt-1 inline-flex items-center gap-1 text-xs font-semibold", st.tone)}>
                      <Icon aria-hidden className="size-3.5" /> {st.text}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-2">Un presupuesto es un plan: decide antes de gastar a dónde va cada peso. Puedes empezar desde cero o con una plantilla.</p>
          )}
        </Card>

        {nextLesson ? (
          <Card tone="dark" className="flex flex-col p-6 md:col-span-2 xl:col-span-1">
            <p className="t-overline text-accent">Tu siguiente lección</p>
            <h2 className="mt-3 font-title text-2xl leading-8 font-medium text-nav-ink-active">{nextLesson.lesson.title}</h2>
            <p className="mt-3 text-sm text-nav-ink">{nextLesson.lesson.summary}</p>
            <div className="mt-auto pt-5">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(edu.pct * 100)}%` }} />
              </div>
              <p className="mt-2 text-xs text-nav-ink">
                Ruta: {f.pct(edu.pct, 0)} · {nextLesson.lesson.minutes} min esta lección
              </p>
              <Link
                href={`/universidad/rutas/${edu.course.slug}/${nextLesson.lesson.slug}`}
                className={buttonClass("accent", "lg", "mt-4 w-full sm:w-auto")}
              >
                {edu.completed.size > 0 ? "Retomar donde quedaste" : "Empezar la ruta"}
              </Link>
            </div>
          </Card>
        ) : null}
      </div>

      <details className="group mt-5 rounded-lg border border-border bg-surface">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4">
          <span className="text-base font-semibold text-ink">
            Más indicadores <span className="font-normal text-muted">· {MORE_KEYS.length}</span>
          </span>
          <ChevronDown aria-hidden className="size-5 text-muted transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border p-4 sm:p-5">
          <IndicatorGrid indicators={o.indicators} f={f} keys={MORE_KEYS} />
        </div>
      </details>
    </>
  );
}
