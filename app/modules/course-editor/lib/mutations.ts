import { and, eq, gt, gte, sql } from "drizzle-orm";
import { CourseStatus, courses, lessons, modules } from "~/db/schema";
import { markdown } from "~/lib/text";
import {
  getLessonById,
  getLessonsByModule,
  getModulesByCourse,
  type Db,
} from "./queries";

export function updateCourse(
  db: Db,
  id: number,
  title: string,
  description: string
) {
  return db
    .update(courses)
    .set({ title, description, updatedAt: new Date().toISOString() })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

export function updateCourseStatus(db: Db, id: number, status: CourseStatus) {
  return db
    .update(courses)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

export function updateCourseSalesCopy(db: Db, id: number, salesCopy: string) {
  if (salesCopy.trim().length === 0) {
    throw new Error("Sales copy cannot be empty");
  }

  return db
    .update(courses)
    .set({
      salesCopy: markdown(salesCopy),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

export function updateCoursePrice(db: Db, id: number, price: number) {
  return db
    .update(courses)
    .set({ price, updatedAt: new Date().toISOString() })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

export function updateCoursePppEnabled(
  db: Db,
  id: number,
  pppEnabled: boolean
) {
  return db
    .update(courses)
    .set({ pppEnabled, updatedAt: new Date().toISOString() })
    .where(eq(courses.id, id))
    .returning()
    .get();
}

export function createModule(
  db: Db,
  courseId: number,
  title: string,
  position: number | null
) {
  const pos =
    position ??
    (db
      .select({ max: sql<number>`coalesce(max(${modules.position}), 0)` })
      .from(modules)
      .where(eq(modules.courseId, courseId))
      .get()?.max ?? 0) + 1;

  return db
    .insert(modules)
    .values({ courseId, title, position: pos })
    .returning()
    .get();
}

export function updateModuleTitle(db: Db, id: number, title: string) {
  return db
    .update(modules)
    .set({ title })
    .where(eq(modules.id, id))
    .returning()
    .get();
}

export function deleteModule(db: Db, id: number) {
  // Delete all lessons in this module first
  db.delete(lessons).where(eq(lessons.moduleId, id)).run();
  return db.delete(modules).where(eq(modules.id, id)).returning().get();
}

export function reorderModules(db: Db, courseId: number, moduleIds: number[]) {
  for (let i = 0; i < moduleIds.length; i++) {
    db.update(modules)
      .set({ position: i + 1 })
      .where(and(eq(modules.id, moduleIds[i]), eq(modules.courseId, courseId)))
      .run();
  }
  return getModulesByCourse(db, courseId);
}

export function createLesson(
  db: Db,
  moduleId: number,
  title: string,
  content: string | null,
  videoUrl: string | null,
  position: number | null,
  durationMinutes: number | null
) {
  const pos =
    position ??
    (db
      .select({ max: sql<number>`coalesce(max(${lessons.position}), 0)` })
      .from(lessons)
      .where(eq(lessons.moduleId, moduleId))
      .get()?.max ?? 0) + 1;

  return db
    .insert(lessons)
    .values({
      moduleId,
      title,
      content: content === null ? null : markdown(content),
      videoUrl,
      position: pos,
      durationMinutes,
    })
    .returning()
    .get();
}

export function updateLessonTitle(db: Db, id: number, title: string) {
  return db
    .update(lessons)
    .set({ title })
    .where(eq(lessons.id, id))
    .returning()
    .get();
}

export function deleteLesson(db: Db, id: number) {
  return db.delete(lessons).where(eq(lessons.id, id)).returning().get();
}

export function reorderLessons(db: Db, moduleId: number, lessonIds: number[]) {
  for (let i = 0; i < lessonIds.length; i++) {
    db.update(lessons)
      .set({ position: i + 1 })
      .where(and(eq(lessons.id, lessonIds[i]), eq(lessons.moduleId, moduleId)))
      .run();
  }
  return getLessonsByModule(db, moduleId);
}

export function moveLessonToModule(
  db: Db,
  lessonId: number,
  targetModuleId: number,
  targetPosition: number
) {
  const lesson = getLessonById(db, lessonId);
  if (!lesson) return null;

  const sourceModuleId = lesson.moduleId;

  // 1. Close the gap in the source module
  db.update(lessons)
    .set({ position: sql`${lessons.position} - 1` })
    .where(
      and(
        eq(lessons.moduleId, sourceModuleId),
        gt(lessons.position, lesson.position)
      )
    )
    .run();

  // 2. Open a gap in the destination module
  db.update(lessons)
    .set({ position: sql`${lessons.position} + 1` })
    .where(
      and(
        eq(lessons.moduleId, targetModuleId),
        gte(lessons.position, targetPosition)
      )
    )
    .run();

  // 3. Move the lesson to the target module at the target position
  return db
    .update(lessons)
    .set({ moduleId: targetModuleId, position: targetPosition })
    .where(eq(lessons.id, lessonId))
    .returning()
    .get();
}
