import "server-only";
import { loadForUser } from "./action-utils";
import { getProgress } from "./services/education";
import { allLessons, COURSES } from "@/lib/education/catalog";

export async function courseProgress(courseSlug = "finanzas-personales") {
  const course = COURSES.find((c) => c.slug === courseSlug)!;
  const progress = await loadForUser(({ tx, userId }) => getProgress(tx, userId, courseSlug));
  const completed = new Set(progress.lessons.filter((l) => l.completedAt).map((l) => l.lessonSlug));
  const lessons = allLessons(course);
  const next = lessons.find((l) => !completed.has(l.lesson.slug)) ?? null;
  return { course, progress, completed, lessons, next, pct: lessons.length ? completed.size / lessons.length : 0 };
}
