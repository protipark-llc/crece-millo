"use client";

import { useState } from "react";
import type { ExerciseQuestion } from "@/lib/education/types";
import { ActionForm, SubmitButton } from "@/components/ui/form";
import { cn } from "@/components/ui/cn";
import { completeLessonAction } from "@/app/(app)/universidad/actions";

export function LessonQuiz({ course, lesson, quiz, completed }: { course: string; lesson: string; quiz?: ExerciseQuestion[]; completed: boolean }) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState(false);
  const allAnswered = !quiz || quiz.every((q) => typeof answers[q.id] === "number");
  return (
    <div className="space-y-5">
      {quiz?.map((q, qi) => (
        <fieldset key={q.id} className="rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-medium text-ink">
            {qi + 1}. {q.prompt}
          </legend>
          <div className="mt-2 space-y-1.5">
            {q.options.map((o, oi) => {
              const selected = answers[q.id] === oi;
              const isRight = checked && oi === q.answer;
              const isWrong = checked && selected && oi !== q.answer;
              return (
                <label key={oi} className={cn("flex cursor-pointer items-start gap-2 rounded-sm px-2 py-1.5 text-sm", isRight && "bg-pos-soft", isWrong && "bg-neg-soft", !checked && "hover:bg-surface-2")}>
                  <input type="radio" name={`q-${q.id}`} className="mt-0.5 accent-[var(--brand)]" checked={selected} disabled={checked} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                  <span className="text-ink">{o}</span>
                </label>
              );
            })}
          </div>
          {checked && (
            <p className={cn("mt-2 text-sm", answers[q.id] === q.answer ? "text-pos" : "text-ink-2")}>
              {answers[q.id] === q.answer ? "Correcto. " : "No exactamente. "}
              {q.explanation}
            </p>
          )}
        </fieldset>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        {quiz && !checked && (
          <button type="button" disabled={!allAnswered} onClick={() => setChecked(true)} className="inline-flex h-10 items-center rounded-md border border-border-strong bg-surface px-4 text-sm font-medium text-ink hover:bg-surface-2 disabled:opacity-50">
            Revisar respuestas
          </button>
        )}
        {(!quiz || checked) && (
          <ActionForm action={completeLessonAction}>
            <input type="hidden" name="course" value={course} />
            <input type="hidden" name="lesson" value={lesson} />
            <input type="hidden" name="answers" value={JSON.stringify(answers)} />
            <SubmitButton>{completed ? "Guardar de nuevo como completada" : "Marcar lección como completada"}</SubmitButton>
          </ActionForm>
        )}
        {completed && (
          <ActionForm action={completeLessonAction}>
            <input type="hidden" name="course" value={course} />
            <input type="hidden" name="lesson" value={lesson} />
            <input type="hidden" name="completed" value="0" />
            <SubmitButton variant="ghost">Marcar como pendiente</SubmitButton>
          </ActionForm>
        )}
      </div>
    </div>
  );
}
