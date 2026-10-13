import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Plus } from "lucide-react";
import { LEARNING_AREAS } from "@/lib/education/catalog";
import { courseProgress } from "@/server/education-data";
import { financePage } from "@/server/page-data";
import { periodBreakdown } from "@/server/services/finance-data";
import { daysInMonth, monthStart, parts } from "@/lib/finance/dates";
import { getCurrentUser } from "@/server/session";
import { currentSections } from "@/server/sections";
import { redirect } from "next/navigation";
import { Badge, ButtonLink, Card, Meter, buttonClass } from "@/components/ui/primitives";
import { AreaIcon } from "@/components/education/area-icon";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Universidad" };

export default async function UniversityHome() {
  const sections = await currentSections();
  if (!sections.enabled.includes("uni_inicio")) redirect(sections.home);
  const user = await getCurrentUser();
  const cp = await courseProgress();
  const fin = await financePage(({ d, f }) => {
    const m = periodBreakdown(d, monthStart(d.today), d.today);
    const { y, m: mo, d: day } = parts(d.today);
    const wd = new Intl.DateTimeFormat(d.locale, { weekday: "long", timeZone: "UTC" }).format(new Date(`${d.today}T12:00:00Z`));
    return {
      income: m.income,
      expense: m.expense,
      net: m.net,
      f,
      hasAccounts: d.accounts.length > 0,
      monthPct: day / daysInMonth(y, mo),
      today: `${wd} ${f.date(d.today).replace(/ \d{4}$/, "")}`,
    };
  });
  const { f } = fin;
  const firstName = user?.name.split(" ")[0] ?? "";
  const modules = [...cp.course.modules].sort((a, b) => a.level - b.level);
  const moduleDone = (slug: string) => cp.lessons.filter((l) => l.module.slug === slug && cp.completed.has(l.lesson.slug)).length;
  const current = cp.next?.module.slug;
  const started = cp.completed.size > 0;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card tone="dark" className="p-6 sm:p-7">
          <p className="t-overline text-nav-accent">
            Hola{firstName ? `, ${firstName}` : ""} · {fin.today}
          </p>
          <h1 className="mt-3 font-title text-[26px] leading-8 font-medium tracking-[-0.01em] text-nav-ink-active sm:text-[32px] sm:leading-[38px]">
            {cp.next
              ? started
                ? `Retoma donde quedaste: Nivel ${cp.next.module.level}, ${cp.next.module.title.charAt(0).toLowerCase()}${cp.next.module.title.slice(1)}.`
                : "Empieza tu ruta: en 7 niveles pasas de conocer tu situación a decidir con claridad."
              : "Completaste toda la ruta. Repasa las lecciones cuando quieras."}
          </h1>
          {cp.next && (
            <div className="mt-5 flex flex-col gap-4 rounded-lg bg-white/8 p-4 sm:flex-row sm:items-center">
              <span aria-hidden className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-white/10 text-nav-ink-active">
                <BookOpen className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-nav-ink-active">{cp.next.lesson.title}</p>
                <p className="mt-0.5 text-xs text-nav-ink">
                  {cp.next.lesson.minutes} min · ruta al {f.pct(cp.pct, 0)}
                </p>
                <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(cp.pct * 100)}%` }} />
                </div>
              </div>
              <Link href={`/universidad/rutas/${cp.course.slug}/${cp.next.lesson.slug}`} className={buttonClass("accent", "md")}>
                {started ? "Continuar" : "Empezar"}
              </Link>
            </div>
          )}
        </Card>

        <Card className="flex flex-col p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">Tu mes en un vistazo</h2>
            {fin.hasAccounts && fin.net < 0 && <Badge tone="warn">! Gastas más de lo que entra</Badge>}
          </div>
          {fin.hasAccounts ? (
            <>
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-2">Te entró</dt>
                  <dd className="font-semibold text-pos tabular">{fin.income > 0 ? "+" : ""}{f.money(fin.income)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-2">Gastaste</dt>
                  <dd className="font-semibold text-neg tabular">{fin.expense > 0 ? "−" : ""}{f.money(fin.expense)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-2">Te queda</dt>
                  <dd className={cn("font-semibold tabular", fin.net < 0 ? "text-neg" : "text-ink")}>{f.money(fin.net)}</dd>
                </div>
              </dl>
              {fin.income > 0 && (
                <div className="mt-3">
                  <Meter value={fin.expense} max={fin.income} today={fin.monthPct} label="Gasto frente a lo que entró" />
                  <p className="mt-1.5 text-xs text-muted">
                    Gastaste el {f.pct(fin.expense / fin.income, 0)} de lo que entró · línea: hoy, {f.pct(fin.monthPct, 0)} del mes
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-2">Registra tus cuentas para ver cuánto te entra, cuánto gastas y cuánto te queda.</p>
          )}
          <div className="mt-auto flex flex-wrap gap-2 pt-5">
            <ButtonLink href="/universidad/finanzas" variant="secondary" size="sm">
              Ir a mi panel
            </ButtonLink>
            <ButtonLink href="/universidad/finanzas/movimientos/nuevo?tipo=expense" variant="ghost" size="sm">
              <Plus aria-hidden className="size-4" /> Registrar gasto
            </ButtonLink>
          </div>
        </Card>
      </div>

      <Card className="mt-5 p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="t-section text-ink">{/^ruta/i.test(cp.course.title) ? cp.course.title : `Ruta de ${cp.course.title.toLowerCase()}`}</h2>
            <p className="mt-1 text-xs text-muted">7 niveles para pasar de conocer tu situación a decidir con claridad, a tu ritmo y sin juicios.</p>
          </div>
          <Link href="/universidad/rutas" className="text-sm font-semibold text-ink tabular hover:underline">
            {cp.completed.size} de {cp.lessons.length} lecciones · {f.pct(cp.pct, 0)}
          </Link>
        </div>
        <ol className="mt-6 grid gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {modules.map((m, i) => {
            const done = moduleDone(m.slug);
            const complete = done === m.lessons.length;
            const isCurrent = m.slug === current;
            return (
              <li key={m.slug} className="relative flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                {i < modules.length - 1 && (
                  <span aria-hidden className={cn("absolute top-5 left-[calc(50%+22px)] hidden h-0.5 w-[calc(100%-28px)] lg:block", complete ? "bg-ink" : "bg-surface-3")} />
                )}
                <span
                  className={cn(
                    "relative z-10 inline-flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    complete ? "bg-ink text-bg" : isCurrent ? "bg-accent text-accent-ink ring-4 ring-accent/20" : "border-2 border-border-strong bg-surface text-ink",
                  )}
                >
                  {complete ? <Check aria-hidden className="size-4" /> : m.level}
                </span>
                <span className="min-w-0">
                  <span className={cn("block text-sm", isCurrent ? "font-semibold text-ink" : "text-ink-2")}>{m.title}</span>
                  <span className={cn("mt-0.5 block text-xs", complete ? "font-semibold text-pos" : isCurrent ? "font-semibold text-ink" : "text-muted")}>
                    {complete ? `✓ ${done} de ${m.lessons.length}` : isCurrent ? `En curso · ${done} de ${m.lessons.length}` : `${done} de ${m.lessons.length}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </Card>

      <div className="mt-8 mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="t-section text-ink">Tus 8 áreas de crecimiento</h2>
        <p className="text-xs text-muted">Empezamos por el dinero; las demás llegan pronto.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LEARNING_AREAS.map((a) => {
          const available = a.status === "available";
          const inner = (
            <div className={cn("flex h-full flex-col rounded-lg p-4", available ? "border-2 border-brand bg-surface" : "border border-border bg-surface-2")}>
              <div className="flex items-start justify-between gap-2">
                <span aria-hidden className={cn("inline-flex size-9 items-center justify-center rounded-md", available ? "bg-brand-soft text-ink" : "bg-surface-3 text-ink-2")}>
                  <AreaIcon name={a.icon} className="size-5" />
                </span>
                {available ? (
                  <Badge tone="pos">
                    <Check aria-hidden className="size-3" /> Disponible
                  </Badge>
                ) : (
                  <Badge>Próximamente</Badge>
                )}
              </div>
              <p className={cn("mt-3 font-semibold", available ? "text-ink" : "text-ink-2")}>{a.name}</p>
              <p className="mt-1 text-sm text-muted">{a.description}</p>
              {available && (
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-ink">
                  Ir a la ruta <ArrowRight aria-hidden className="size-3.5" />
                </span>
              )}
            </div>
          );
          return available ? (
            <Link key={a.slug} href="/universidad/rutas" className="block rounded-lg">
              {inner}
            </Link>
          ) : (
            <div key={a.slug} aria-disabled="true">
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
