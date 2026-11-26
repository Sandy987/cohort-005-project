import { and, eq, or, sql } from "drizzle-orm";
import {
  modules,
  lessons,
  lessonProgress,
  LessonProgressStatus,
} from "~/db/schema";
import type { Db } from "./db";

function getCourseLessonIds(db: Db, courseId: number): number[] {
  const courseModules = db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .all();

  if (courseModules.length === 0) return [];

  const courseLessons = db
    .select({ id: lessons.id })
    .from(lessons)
    .where(or(...courseModules.map((m) => eq(lessons.moduleId, m.id))))
    .all();

  return courseLessons.map((l) => l.id);
}

function durationWeightedProgress(db: Db, userId: number, lessonIds: number[]) {
  const courseLessons = db
    .select({
      id: lessons.id,
      durationMinutes: lessons.durationMinutes,
    })
    .from(lessons)
    .where(or(...lessonIds.map((id) => eq(lessons.id, id))))
    .all();

  const totalDuration = courseLessons.reduce(
    (sum, l) => sum + (l.durationMinutes ?? 1),
    0
  );

  if (totalDuration === 0) return 0;

  const completed = db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        or(...lessonIds.map((id) => eq(lessonProgress.lessonId, id)))
      )
    )
    .all();

  const completedIds = new Set(completed.map((p) => p.lessonId));

  const completedDuration = courseLessons
    .filter((l) => completedIds.has(l.id))
    .reduce((sum, l) => sum + (l.durationMinutes ?? 1), 0);

  return Math.round((completedDuration / totalDuration) * 100);
}

export function calculateProgress(
  db: Db,
  {
    userId,
    courseId,
    weightByDuration,
  }: { userId: number; courseId: number; weightByDuration: boolean }
) {
  const lessonIds = getCourseLessonIds(db, courseId);

  if (lessonIds.length === 0) return 0;

  if (weightByDuration) {
    return durationWeightedProgress(db, userId, lessonIds);
  }

  const completedCount = db
    .select({ count: sql<number>`count(*)` })
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        eq(lessonProgress.status, LessonProgressStatus.Completed),
        or(...lessonIds.map((id) => eq(lessonProgress.lessonId, id)))
      )
    )
    .get();

  return Math.round(((completedCount?.count ?? 0) / lessonIds.length) * 100);
}

export function getLessonProgressForCourse(
  db: Db,
  userId: number,
  courseId: number
) {
  const courseModules = db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .all();

  if (courseModules.length === 0) return [];

  const courseLessons = db
    .select({ id: lessons.id })
    .from(lessons)
    .where(or(...courseModules.map((m) => eq(lessons.moduleId, m.id))))
    .all();

  if (courseLessons.length === 0) return [];

  return db
    .select()
    .from(lessonProgress)
    .where(
      and(
        eq(lessonProgress.userId, userId),
        or(...courseLessons.map((l) => eq(lessonProgress.lessonId, l.id)))
      )
    )
    .all();
}

export function getNextIncompleteLesson(
  db: Db,
  userId: number,
  courseId: number
) {
  const courseModules = db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.position)
    .all();

  if (courseModules.length === 0) return null;

  for (const mod of courseModules) {
    const moduleLessons = db
      .select()
      .from(lessons)
      .where(eq(lessons.moduleId, mod.id))
      .orderBy(lessons.position)
      .all();

    for (const lesson of moduleLessons) {
      const progress = db
        .select()
        .from(lessonProgress)
        .where(
          and(
            eq(lessonProgress.userId, userId),
            eq(lessonProgress.lessonId, lesson.id)
          )
        )
        .get();
      if (!progress || progress.status !== LessonProgressStatus.Completed) {
        return lesson;
      }
    }
  }

  return null;
}

export function getLearnerProgress(db: Db, userId: number, courseId: number) {
  const progress = calculateProgress(db, {
    userId,
    courseId,
    weightByDuration: false,
  });

  const lessonProgressMap: Record<number, string> = {};
  const progressRecords = getLessonProgressForCourse(db, userId, courseId);
  for (const record of progressRecords) {
    lessonProgressMap[record.lessonId] = record.status;
  }

  const nextLesson = getNextIncompleteLesson(db, userId, courseId);
  const nextLessonId = nextLesson?.id ?? null;

  return { progress, lessonProgressMap, nextLessonId };
}
