import { and, eq } from "drizzle-orm";
import type { Tx } from "@/lib/db/client";
import { courseEnrollments, lessonProgress } from "@/lib/db/schema";

export async function getProgress(tx: Tx, userId: string, courseSlug: string) {
  const [enrollment] = await tx
    .select()
    .from(courseEnrollments)
    .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseSlug, courseSlug)));
  const lessons = await tx
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.courseSlug, courseSlug)));
  return { enrollment: enrollment ?? null, lessons };
}

export async function enroll(tx: Tx, userId: string, courseSlug: string) {
  await tx.insert(courseEnrollments).values({ userId, courseSlug }).onConflictDoNothing();
}

export async function setLessonCompleted(
  tx: Tx,
  userId: string,
  courseSlug: string,
  lessonSlug: string,
  completed: boolean,
  response: unknown = null,
  totalLessons?: number,
) {
  await enroll(tx, userId, courseSlug);
  await tx
    .insert(lessonProgress)
    .values({ userId, courseSlug, lessonSlug, completedAt: completed ? new Date() : null, response })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.courseSlug, lessonProgress.lessonSlug],
      set: { completedAt: completed ? new Date() : null, response, updatedAt: new Date() },
    });
  if (totalLessons) {
    const done = (await getProgress(tx, userId, courseSlug)).lessons.filter((l) => l.completedAt).length;
    await tx
      .update(courseEnrollments)
      .set({ completedAt: done >= totalLessons ? new Date() : null })
      .where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseSlug, courseSlug)));
  }
}
