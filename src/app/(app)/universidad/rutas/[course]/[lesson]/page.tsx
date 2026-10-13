import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lightbulb, AlertTriangle, Info } from "lucide-react";
import { findLesson } from "@/lib/education/catalog";
import type { LessonBlock } from "@/lib/education/types";
import { courseProgress } from "@/server/education-data";
import { Badge, ButtonLink, Card } from "@/components/ui/primitives";
import { LessonQuiz } from "@/components/education/lesson-quiz";

export async function generateMetadata({ params }: { params: Promise<{ course: string; lesson: string }> }): Promise<Metadata> {
  const { course, lesson } = await params;
  return { title: findLesson(course, lesson)?.lesson.title ?? "Lección" };
}

function Block({ b }: { b: LessonBlock }) {
  switch (b.type) {
    case "paragraph":
      return <p className="leading-relaxed text-ink-2">{b.text}</p>;
    case "heading":
      return <h2 className="pt-2 text-lg font-semibold text-ink">{b.text}</h2>;
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag className={`${b.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 text-ink-2`}>
          {b.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </Tag>
      );
    }
    case "example":
      return (
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="mb-2 text-sm font-semibold text-ink">Ejemplo · {b.title}</p>
          <ul className="space-y-1 text-sm text-ink-2 tabular">
            {b.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </div>
      );
    case "callout": {
      const Icon = b.tone === "tip" ? Lightbulb : b.tone === "warning" ? AlertTriangle : Info;
      const tone = b.tone === "tip" ? "bg-brand-soft text-brand" : b.tone === "warning" ? "bg-warn-soft text-warn" : "bg-info-soft text-info";
      return (
        <div className={`flex gap-3 rounded-md px-4 py-3 text-sm ${tone}`}>
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
          <p className="text-ink-2">{b.text}</p>
        </div>
      );
    }
    case "formula":
      return (
        <div className="rounded-lg border border-brand/30 p-4">
          <p className="font-mono text-sm font-semibold text-ink">{b.formula}</p>
          <p className="mt-1 text-sm text-ink-2">{b.explanation}</p>
        </div>
      );
  }
}

export default async function LessonPage({ params }: { params: Promise<{ course: string; lesson: string }> }) {
  const { course, lesson } = await params;
  const found = findLesson(course, lesson);
  if (!found) notFound();
  const cp = await courseProgress(course);
  const done = cp.completed.has(lesson);
  const l = found.lesson;
  return (
    <article className="mx-auto max-w-3xl">
      <Link href="/universidad/rutas" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft aria-hidden className="size-3.5" /> Ruta de aprendizaje
      </Link>
      <p className="text-xs font-medium uppercase tracking-wide text-brand">
        Nivel {found.module.level} · {found.module.title}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">{l.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock aria-hidden className="size-3.5" /> {l.minutes} min
        </span>
        {done && (
          <Badge tone="pos">
            <CheckCircle2 aria-hidden className="size-3" /> Completada
          </Badge>
        )}
      </div>
      <p className="mt-3 text-lg text-ink-2">{l.summary}</p>
      <div className="mt-6 space-y-4">
        {l.blocks.map((b, i) => (
          <Block key={i} b={b} />
        ))}
      </div>
      {l.practice && (
        <Card className="mt-8 flex flex-wrap items-center gap-4 border-brand/40 p-5">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">Reto práctico</p>
            <p className="text-sm text-ink-2">{l.practice.text}</p>
          </div>
          <ButtonLink href={l.practice.href}>{l.practice.cta}</ButtonLink>
        </Card>
      )}
      <section className="mt-8" aria-labelledby="quiz">
        <h2 id="quiz" className="mb-3 text-lg font-semibold text-ink">
          {l.quiz?.length ? "Comprueba lo aprendido" : "¿Terminaste?"}
        </h2>
        <LessonQuiz course={course} lesson={lesson} quiz={l.quiz} completed={done} />
      </section>
      <nav aria-label="Lecciones" className="mt-10 flex justify-between gap-3 border-t border-border pt-5 text-sm">
        {found.prev ? (
          <Link href={`/universidad/rutas/${course}/${found.prev.slug}`} className="inline-flex items-center gap-1 text-ink-2 hover:text-ink">
            <ArrowLeft aria-hidden className="size-3.5" /> {found.prev.title}
          </Link>
        ) : (
          <span />
        )}
        {found.next && (
          <Link href={`/universidad/rutas/${course}/${found.next.slug}`} className="inline-flex items-center gap-1 text-right font-medium text-brand hover:underline">
            {found.next.title} <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </nav>
      <p className="mt-8 text-xs text-muted">Contenido educativo general. No constituye asesoría financiera, tributaria ni legal personalizada.</p>
    </article>
  );
}
