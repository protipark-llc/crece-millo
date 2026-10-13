import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { loadForUser } from "@/server/action-utils";
import { routeProgress } from "@/server/services/copilot";
import { DROPSHIP_ROUTE, routeStatus } from "@/lib/copilot/route";
import { Card, Meter } from "@/components/ui/primitives";
import { InlineAction } from "@/components/ui/form";
import { Crumbs, EntrepreneurTabs } from "@/components/copilot/nav";
import { cn } from "@/components/ui/cn";
import { routeStepAction } from "../co-piloto/actions";

export const metadata: Metadata = { title: "Ruta de dropshipping" };

export default async function RoutePage() {
  const done = await loadForUser(({ tx, userId }) => routeProgress(tx, userId));
  const st = routeStatus(done);
  return (
    <>
      <Crumbs items={[{ href: "/comunidad", label: "Comunidad" }, { href: "/comunidad/emprendedores", label: "Emprendedores" }, { label: "Ruta" }]} />
      <h1 className="t-page mt-2 text-ink">Ruta de dropshipping</h1>
      <p className="mt-2 max-w-2xl text-ink-2">6 fases para pasar de la idea a un negocio con números claros. Marca cada paso cuando lo completes; tu avance se guarda.</p>
      <EntrepreneurTabs current="ruta" />
      <Card className="mb-5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-semibold text-ink tabular">
            {st.done} de {st.total} pasos · fase {st.phase} de {DROPSHIP_ROUTE.length}
          </p>
          {st.next && <p className="text-sm text-ink-2">Siguiente: {st.next.title}</p>}
        </div>
        <div className="mt-3">
          <Meter value={st.done} max={st.total} tone="accent" size="lg" label="Avance de la ruta de dropshipping" />
        </div>
      </Card>
      <ol className="space-y-5">
        {DROPSHIP_ROUTE.map((phase) => {
          const doneHere = phase.steps.filter((s) => done.has(s.key)).length;
          const complete = doneHere === phase.steps.length;
          return (
            <li key={phase.n}>
              <Card>
                <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
                  <span
                    className={cn(
                      "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                      complete ? "bg-ink text-bg" : phase.n === st.phase ? "bg-accent text-accent-ink" : "border-2 border-border-strong text-ink",
                    )}
                  >
                    {complete ? <Check aria-hidden className="size-4" /> : phase.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-ink">
                      Fase {phase.n} · {phase.title}
                    </h2>
                    <p className="text-sm text-ink-2">{phase.goal}</p>
                  </div>
                  <span className="text-sm text-muted tabular">
                    {doneHere} de {phase.steps.length}
                  </span>
                </div>
                <ul className="divide-y divide-border">
                  {phase.steps.map((s) => {
                    const isDone = done.has(s.key);
                    return (
                      <li key={s.key} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start">
                        {isDone ? <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-pos" /> : <Circle aria-hidden className="mt-0.5 size-5 shrink-0 text-muted" />}
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-semibold", isDone ? "text-ink-2" : "text-ink")}>
                            {s.title} <span className="sr-only">({isDone ? "completo" : "pendiente"})</span>
                          </p>
                          <p className="mt-0.5 text-sm text-ink-2">{s.text}</p>
                          {s.link && (
                            <Link href={s.link.href} className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-ink hover:underline">
                              {s.link.label} <ArrowRight aria-hidden className="size-3.5" />
                            </Link>
                          )}
                        </div>
                        <InlineAction action={routeStepAction} fields={{ step: s.key, done: isDone ? "" : "on" }} className="border border-border">
                          {isDone ? "Marcar pendiente" : "Marcar hecho"}
                        </InlineAction>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>
    </>
  );
}
