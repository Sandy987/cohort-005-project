import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { LessonProgressStatus } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createCourseDetail } from "../index.server";

// No module owns writing modules, lessons or progress yet, so these rows go
// in directly. Kept in one place so a schema change touches only this file.

export function setup() {
  const db = createTestDb();
  const base = seedBaseData(db);
  return { db, ...base, courseDetail: createCourseDetail(db) };
}

export function addModule(
  db: TestDb,
  values: { courseId: number; title: string; position: number }
) {
  return db.insert(schema.modules).values(values).returning().get();
}

export function addLesson(
  db: TestDb,
  values: {
    moduleId: number;
    title: string;
    position: number;
    durationMinutes?: number;
  }
) {
  return db.insert(schema.lessons).values(values).returning().get();
}

export function markLesson(
  db: TestDb,
  values: { userId: number; lessonId: number; status: LessonProgressStatus }
) {
  db.insert(schema.lessonProgress).values(values).run();
}

export function addCourse(
  db: TestDb,
  instructorId: number,
  categoryId: number
) {
  return db
    .insert(schema.courses)
    .values({
      title: "Other Course",
      slug: "other-course",
      description: "Another course",
      salesCopy: markdown("Other sales copy"),
      instructorId,
      categoryId,
      status: schema.CourseStatus.Published,
    })
    .returning()
    .get();
}

/** A second course with one lesson, so queries must filter to the right one. */
export function addOtherCourseWithLesson(
  db: TestDb,
  { instructorId, categoryId }: { instructorId: number; categoryId: number }
) {
  const other = addCourse(db, instructorId, categoryId);
  const mod = addModule(db, { courseId: other.id, title: "X", position: 1 });
  const lesson = addLesson(db, {
    moduleId: mod.id,
    title: "Other",
    position: 1,
  });
  return { course: other, lesson };
}
