"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { runAction, type ActionState } from "@/server/action-utils";
import { allLessons, findLesson } from "@/lib/education/catalog";
import { setLessonCompleted } from "@/server/services/education";
import { UserFacingError } from "@/server/services/errors";

const slug = z.string().regex(/^[a-z0-9-]{1,80}$/);

/**
 * Completa una lección. Si tiene cuestionario, la calificación se calcula en el servidor
 * con el catálogo (no se confía en el cliente).
 */
export async function completeLessonAction(_: ActionState, fd: FormData) {
  return runAction(z.object({ course: slug, lesson: slug, answers: z.string().max(2000).optional(), completed: z.string().optional() }), fd, async ({ tx, userId, input }) => {
    const found = findLesson(input.course, input.lesson);
    if (!found) throw new UserFacingError("La lección no existe.");
    const completed = input.completed !== "0";
    let response: unknown = null;
    let message = completed ? "Lección completada." : "Lección marcada como pendiente.";
    if (completed && found.lesson.quiz?.length) {
      let answers: Record<string, number> = {};
      try {
        answers = JSON.parse(input.answers ?? "{}");
      } catch {
        throw new UserFacingError("Respuestas inválidas.");
      }
      const missing = found.lesson.quiz.filter((q) => typeof answers[q.id] !== "number");
      if (missing.length) throw new UserFacingError("Responde todas las preguntas antes de terminar.");
      const correct = found.lesson.quiz.filter((q) => answers[q.id] === q.answer).length;
      response = { answers, correct, total: found.lesson.quiz.length };
      message = `Lección completada: ${correct} de ${found.lesson.quiz.length} respuestas correctas.`;
    }
    await setLessonCompleted(tx, userId, input.course, input.lesson, completed, response, allLessons(found.course).length);
    revalidatePath("/universidad", "layout");
    return { message };
  });
}
