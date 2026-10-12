import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { courseProgress } from "@/server/education-data";
import { Card, CardHeader, Meter, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Rutas de aprendizaje" };

export default async function PathsPage() {
  const cp = await courseProgress();
  return (
    <>
      <PageHeader eyebrow="Ruta de aprendizaje" title={cp.course.title} description={cp.course.description} />
      <Card className="mb-6 p-5">
        <div className="mb-2 flex justify-between text-sm">
          <span className="font-medium text-ink">Tu avance</span>
          <span className="text-muted">{Math.round(cp.pct * 100)} %</span>
        </div>
        <Meter value={cp.completed.size} max={cp.lessons.length} label="Avance de la ruta" />
      </Card>
      <ol className="space-y-4">
        {cp.course.modules.map((m) => {
          const done = m.lessons.filter((l) => cp.completed.has(l.slug)).length;
          return (
            <li key={m.slug}>
              <Card>
                <CardHeader
                  title={
                    <span>
                      <span className="mr-2 inline-flex size-6 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">{m.level}</span>
                      {m.title}
                    </span>
                  }
                  description={m.goal}
                  actions={
                    <span className="text-xs text-muted">
                      {done}/{m.lessons.length}
                    </span>
                  }
                />
                <ul className="divide-y divide-border">
                  {m.lessons.map((l) => {
                    const isDone = cp.completed.has(l.slug);
                    return (
                      <li key={l.slug}>
                        <Link href={`/universidad/rutas/${cp.course.slug}/${l.slug}`} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2">
                          {isDone ? <CheckCircle2 aria-label="Completada" className="size-4 text-pos" /> : <Circle aria-label="Pendiente" className="size-4 text-muted" />}
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">{l.title}</span>
                            <span className="block text-xs text-muted">{l.summary}</span>
                          </span>
                          <span className="flex items-center gap-1 text-xs text-muted">
                            <Clock aria-hidden className="size-3" /> {l.minutes} min
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </li>
          );
        })}
      </ol>
      <p className="mt-6 text-xs text-muted">Próximamente cada nivel podrá incluir videos, lecturas, recursos descargables, retos y evaluaciones. Hoy cada lección incluye contenido breve, un cuestionario y un ejercicio práctico con tus datos.</p>
    </>
  );
}
