import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Clock, Lightbulb, AlertTriangle, Info, Trophy } from "lucide-react";
import { findLesson } from "@/lib/education/catalog";
import type { LessonBlock } from "@/lib/education/types";
import { courseProgress } from "@/server/education-data";
import { Badge, ButtonLink } from "@/components/ui/primitives";
import { LessonQuiz } from "@/components/education/lesson-quiz";

export async function generateMetadata({ params }: { params: Promise<{ course: string; lesson: string }> }): Promise<Metadata> {
  const { course, lesson } = await params;
  return { title: findLesson(course, lesson)?.lesson.title ?? "Lección" };
}

const slugify = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function Block({ b }: { b: LessonBlock }) {
  switch (b.type) {
    case "paragraph":
      return <p className="text-base leading-[26px] text-ink-2">{b.text}</p>;
    case "heading":
      return (
        <h2 id={slugify(b.text)} className="t-section scroll-mt-20 pt-4 text-ink">
          {b.text}
        </h2>
      );
    case "list": {
      const Tag = b.ordered ? "ol" : "ul";
      return (
        <Tag className={`${b.ordered ? "list-decimal" : "list-disc"} space-y-1.5 pl-5 text-base leading-[26px] text-ink-2`}>
          {b.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </Tag>
      );
    }
    case "example":
      return (
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <p className="t-overline text-muted">Ejemplo · {b.title}</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink tabular">
            {b.lines.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ol>
        </div>
      );
    case "callout": {
      const Icon = b.tone === "tip" ? Lightbulb : b.tone === "warning" ? AlertTriangle : Info;
      const tone = b.tone === "tip" ? "bg-surface-2 text-ink" : b.tone === "warning" ? "bg-warn-soft text-warn" : "bg-info-soft text-info";
      const word = b.tone === "tip" ? "Consejo" : b.tone === "warning" ? "Atención" : "Dato";
      return (
        <div className={`flex gap-3 rounded-lg px-4 py-3 text-sm ${tone}`}>
          <Icon aria-hidden className="mt-0.5 size-[18px] shrink-0" />
          <p className="text-ink">
            <strong className="font-semibold">{word}: </strong>
            {b.text}
          </p>
        </div>
      );
    }
    case "formula":
      return (
        <div className="rounded-lg border border-border bg-surface p-4 sm:p-5">
          <p className="font-title text-[17px] font-medium text-ink">{b.formula}</p>
          <p className="mt-1.5 text-sm text-ink-2">{b.explanation}</p>
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
  const idx = found.module.lessons.findIndex((x) => x.slug === l.slug);
  const examples = l.blocks.filter((b) => b.type === "example").length;
  const questions = l.quiz?.length ?? 0;
  const parts = ["lectura", examples ? `${examples} ${examples === 1 ? "ejemplo" : "ejemplos"}` : null, l.practice ? "reto práctico" : null, questions ? `${questions} ${questions === 1 ? "pregunta" : "preguntas"}` : null].filter(Boolean);
  const toc = [
    { id: "idea", label: "La idea en una frase" },
    ...l.blocks.filter((b): b is Extract<LessonBlock, { type: "heading" }> => b.type === "heading").map((b) => ({ id: slugify(b.text), label: b.text })),
    ...(l.practice ? [{ id: "reto", label: "Reto práctico" }] : []),
    { id: "quiz", label: questions ? "Cuestionario" : "Terminar" },
  ];
  return (
    <>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/universidad/rutas" className="inline-flex min-h-9 shrink-0 items-center gap-1 text-sm font-semibold text-ink hover:underline">
          <ArrowLeft aria-hidden className="size-4" /> <span className="hidden sm:inline">{/^ruta/i.test(cp.course.title) ? cp.course.title : `Ruta de ${cp.course.title.toLowerCase()}`}</span>
          <span className="sm:hidden">Ruta</span>
        </Link>
        <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-ink" style={{ width: `${Math.round(cp.pct * 100)}%` }} />
        </div>
        <span className="text-xs text-muted tabular">Ruta al {Math.round(cp.pct * 100)} %</span>
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,680px)_240px] lg:justify-center">
        <article className="min-w-0">
          <p className="t-overline text-ink">
            Nivel {found.module.level} · {found.module.title} · Lección {idx + 1} de {found.module.lessons.length}
          </p>
          <h1 className="mt-3 font-title text-[28px] leading-[34px] font-medium tracking-[-0.02em] text-ink sm:text-[36px] sm:leading-[42px]">{l.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" /> {l.minutes} min · {parts.join(", ")}
            </span>
            {done && (
              <Badge tone="pos">
                <CheckCircle2 aria-hidden className="size-3" /> Completada
              </Badge>
            )}
          </div>
          <div id="idea" className="mt-6 scroll-mt-20 rounded-lg bg-surface-3/60 p-5">
            <p className="t-overline text-ink">La idea en una frase</p>
            <p className="mt-2 text-[17px] leading-7 text-ink">{l.summary}</p>
          </div>
          <div className="mt-6 space-y-4">
            {l.blocks.map((b, i) => (
              <Block key={i} b={b} />
            ))}
          </div>
          {l.practice && (
            <div id="reto" className="mt-8 flex scroll-mt-20 flex-col gap-4 rounded-lg border-2 border-brand bg-surface p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="t-overline text-ink">Reto práctico · con tus datos</p>
                <p className="mt-1.5 text-sm text-ink">{l.practice.text}</p>
              </div>
              <ButtonLink href={l.practice.href}>{l.practice.cta}</ButtonLink>
            </div>
          )}
          {done && (
            <div className="mt-8 flex items-center gap-4 rounded-lg bg-surface p-5">
              <span aria-hidden className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-accent text-accent-ink">
                <Trophy className="size-7" />
              </span>
              <div>
                <p className="font-title text-lg font-medium text-ink">Lección completada</p>
                <p className="text-sm text-ink-2">Un paso más en tu ruta. {found.next ? "La siguiente te espera abajo." : "Terminaste este nivel."}</p>
              </div>
            </div>
          )}
          <section className="mt-8 scroll-mt-20" id="quiz" aria-labelledby="quiz-title">
            <h2 id="quiz-title" className="t-section mb-3 text-ink">
              {questions ? `Comprueba lo aprendido · ${questions} ${questions === 1 ? "pregunta" : "preguntas"}` : "¿Terminaste?"}
            </h2>
            <LessonQuiz course={course} lesson={lesson} quiz={l.quiz} completed={done} />
          </section>
          <nav aria-label="Lecciones" className="mt-10 flex justify-between gap-3 border-t border-border pt-5 text-sm">
            {found.prev ? (
              <Link href={`/universidad/rutas/${course}/${found.prev.slug}`} className="inline-flex min-h-9 items-center gap-1 text-ink-2 hover:text-ink">
                <ArrowLeft aria-hidden className="size-3.5" /> {found.prev.title}
              </Link>
            ) : (
              <span />
            )}
            {found.next && (
              <Link href={`/universidad/rutas/${course}/${found.next.slug}`} className="inline-flex min-h-9 items-center gap-1 text-right font-semibold text-ink hover:underline">
                {found.next.title} <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            )}
          </nav>
          <p className="mt-8 text-xs text-muted">Contenido educativo general. No constituye asesoría financiera, tributaria ni legal personalizada.</p>
        </article>
        <aside className="hidden lg:block">
          <nav aria-label="En esta lección" className="sticky top-6">
            <p className="t-overline text-muted">En esta lección</p>
            <ol className="mt-3 space-y-1">
              {toc.map((t, i) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="flex min-h-9 items-center gap-2.5 rounded-md text-sm text-ink-2 hover:text-ink">
                    <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] tabular">
                      {i + 1}
                    </span>
                    {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>
      </div>
    </>
  );
}
