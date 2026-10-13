import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { LEARNING_AREAS } from "@/lib/education/catalog";
import { courseProgress } from "@/server/education-data";
import { financePage } from "@/server/page-data";
import { liquidBalance, periodBreakdown } from "@/server/services/finance-data";
import { monthStart } from "@/lib/finance/dates";
import { getCurrentUser } from "@/server/session";
import { Badge, ButtonLink, Card, Meter, PageHeader, Stat } from "@/components/ui/primitives";
import { AreaIcon } from "@/components/education/area-icon";

export const metadata: Metadata = { title: "Universidad" };

export default async function UniversityHome() {
  const user = await getCurrentUser();
  const cp = await courseProgress();
  const fin = await financePage(({ d, f }) => {
    const m = periodBreakdown(d, monthStart(d.today), d.today);
    return { cash: f.money(liquidBalance(d)), net: f.money(m.net), netNeg: m.net < 0, hasAccounts: d.accounts.length > 0, steps: d.settings.diagnosticSteps.length };
  });
  return (
    <>
      <PageHeader eyebrow="Universidad digital" title={`Hola, ${user?.name.split(" ")[0] ?? ""}`} description="Aprende y aplica en el mismo lugar. Cada lección conecta con una herramienta para que el conocimiento se convierta en acción." />
      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <p className="text-sm font-medium text-brand">Continúa tu ruta</p>
          <h2 className="mt-1 text-lg font-semibold text-ink">{cp.course.title}</h2>
          <div className="mt-3 flex items-center gap-3">
            <div className="flex-1">
              <Meter value={cp.completed.size} max={cp.lessons.length} label="Avance de la ruta" />
            </div>
            <span className="text-sm text-muted">
              {cp.completed.size}/{cp.lessons.length} lecciones
            </span>
          </div>
          {cp.next ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-2 p-4">
              <div className="min-w-0">
                <p className="text-xs text-muted">
                  Nivel {cp.next.module.level} · {cp.next.module.title}
                </p>
                <p className="font-medium text-ink">{cp.next.lesson.title}</p>
                <p className="text-sm text-ink-2">{cp.next.lesson.summary}</p>
              </div>
              <ButtonLink href={`/universidad/rutas/${cp.course.slug}/${cp.next.lesson.slug}`}>
                <BookOpen aria-hidden className="size-4" /> Estudiar ({cp.next.lesson.minutes} min)
              </ButtonLink>
            </div>
          ) : (
            <p className="mt-4 text-sm text-pos">¡Completaste toda la ruta! Repasa las lecciones cuando quieras.</p>
          )}
        </Card>
        <div className="grid gap-3">
          <Stat label="Caja disponible hoy" value={fin.hasAccounts ? fin.cash : "—"} sub={fin.hasAccounts ? undefined : "Registra tus cuentas"} />
          <Stat label="Flujo neto del mes" value={fin.net} tone={fin.netNeg ? "neg" : undefined} />
          <Link href="/universidad/finanzas" className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Ir a mi centro financiero <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </div>
      </div>
      <h2 className="mb-3 text-base font-semibold text-ink">Áreas de crecimiento</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LEARNING_AREAS.map((a) => {
          const available = a.status === "available";
          const inner = (
            <div className={`h-full rounded-lg border p-4 ${available ? "border-brand/40 bg-surface hover:border-brand" : "border-border bg-surface-2/60"}`}>
              <AreaIcon name={a.icon} className={`mb-2 size-5 ${available ? "text-brand" : "text-muted"}`} />
              <p className={`text-sm font-medium ${available ? "text-ink" : "text-ink-2"}`}>{a.name}</p>
              <p className="mt-1 text-xs text-muted">{a.description}</p>
              {!available && <Badge className="mt-2">Próximamente</Badge>}
            </div>
          );
          return available ? (
            <Link key={a.slug} href="/universidad/rutas" className="block">
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
