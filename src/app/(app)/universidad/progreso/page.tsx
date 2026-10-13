import type { Metadata } from "next";
import Link from "next/link";
import { courseProgress } from "@/server/education-data";
import { financePage } from "@/server/page-data";
import { DIAGNOSTIC_STEPS } from "@/server/services/settings";
import { Card, CardHeader, Meter, PageHeader, Stat } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Mi progreso" };

export default async function ProgressPage() {
  const cp = await courseProgress();
  const steps = await financePage(({ d }) => d.settings.diagnosticSteps.length);
  const quizzes = cp.progress.lessons
    .map((l) => l.response as { correct?: number; total?: number } | null)
    .filter((r): r is { correct: number; total: number } => !!r && typeof r.correct === "number");
  const correct = quizzes.reduce((s, r) => s + r.correct, 0);
  const total = quizzes.reduce((s, r) => s + r.total, 0);
  return (
    <>
      <PageHeader title="Mi progreso" description="Aprender es acumulativo: cada lección y cada dato que registras suma." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Lecciones completadas" value={`${cp.completed.size} de ${cp.lessons.length}`} />
        <Stat label="Respuestas correctas" value={total ? `${correct} de ${total}` : "—"} sub="En los cuestionarios completados" />
        <Stat label="Diagnóstico financiero" value={`${steps} de ${DIAGNOSTIC_STEPS.length} pasos`} />
      </div>
      <Card>
        <CardHeader title="Avance por nivel" />
        <ul className="divide-y divide-border">
          {cp.course.modules.map((m) => {
            const done = m.lessons.filter((l) => cp.completed.has(l.slug)).length;
            return (
              <li key={m.slug} className="px-5 py-3">
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-ink">
                    Nivel {m.level}. {m.title}
                  </span>
                  <span className="text-muted">
                    {done}/{m.lessons.length}
                  </span>
                </div>
                <Meter value={done} max={m.lessons.length} tone={done === m.lessons.length ? "pos" : "brand"} label={`Avance del nivel ${m.level}`} />
              </li>
            );
          })}
        </ul>
      </Card>
      {cp.progress.enrollment?.completedAt && <p className="mt-4 text-sm text-pos">Completaste la ruta el {cp.progress.enrollment!.completedAt!.toLocaleDateString("es-CO")}.</p>}
      <p className="mt-6 text-sm text-ink-2">
        ¿Listo para seguir?{" "}
        <Link href="/universidad/rutas" className="font-medium text-brand hover:underline">
          Ver la ruta completa
        </Link>
      </p>
    </>
  );
}
