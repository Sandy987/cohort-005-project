import { expect } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { CourseStatus, LessonProgressStatus, UserRole } from "~/db/schema";
import { markdown } from "~/lib/text";
import { createCourseEditor } from "../index.server";

export type Editor = ReturnType<typeof createCourseEditor>;
export type Course = typeof schema.courses.$inferSelect;

export function setUp() {
  const db = createTestDb();
  const base = seedBaseData(db);
  const editor = createCourseEditor(db);
  return { db, editor, ...base };
}

// Modules and lessons go in through the editor itself.

export function addModule(editor: Editor, course: Course, title: string) {
  expect(editor.apply(course, { intent: "add-module", title })).toEqual({
    success: true,
    field: "module",
  });
  const page = editor.getPage(course.id);
  const mod = page?.course.modules.find((m) => m.title === title);
  if (!mod) throw new Error(`module ${title} was not added`);
  return mod;
}

export function addLesson(editor: Editor, course: Course, moduleId: number) {
  return (title: string) => {
    editor.apply(course, { intent: "add-lesson", moduleId, title });
    const lessons = editor
      .getPage(course.id)
      ?.course.modules.flatMap((m) => m.lessons);
    const lesson = lessons?.find((l) => l.title === title);
    if (!lesson) throw new Error(`lesson ${title} was not added`);
    return lesson;
  };
}

/** Module and lesson titles, in order, as the editor page shows them. */
export function outline(editor: Editor, courseId: number) {
  return editor
    .getPage(courseId)
    ?.course.modules.map((m) => [m.title, m.lessons.map((l) => l.title)]);
}

// Enrollments, progress and quizzes are written by other parts of the app,
// which have no module yet, so these rows go in directly.

let counter = 0;

export function addCourse(
  db: TestDb,
  instructorId: number,
  categoryId: number
) {
  counter += 1;
  return db
    .insert(schema.courses)
    .values({
      title: `Other ${counter}`,
      slug: `other-${counter}`,
      description: "Another course",
      salesCopy: markdown("Other"),
      instructorId,
      categoryId,
      status: CourseStatus.Published,
    })
    .returning()
    .get();
}

export function addStudent(db: TestDb, name: string) {
  counter += 1;
  return db
    .insert(schema.users)
    .values({
      name,
      email: `student-${counter}@example.com`,
      role: UserRole.Student,
    })
    .returning()
    .get();
}

export function enroll(
  db: TestDb,
  enrollment: { userId: number; courseId: number; completedAt?: string }
) {
  db.insert(schema.enrollments).values(enrollment).run();
}

export function completeLesson(
  db: TestDb,
  progress: { userId: number; lessonId: number }
) {
  db.insert(schema.lessonProgress)
    .values({ ...progress, status: LessonProgressStatus.Completed })
    .run();
}

export function addQuiz(db: TestDb, lessonId: number, title: string) {
  return db
    .insert(schema.quizzes)
    .values({ lessonId, title, passingScore: 0.7 })
    .returning()
    .get();
}

export function attemptQuiz(
  db: TestDb,
  attempt: { userId: number; quizId: number; score: number; passed: boolean }
) {
  db.insert(schema.quizAttempts).values(attempt).run();
}
