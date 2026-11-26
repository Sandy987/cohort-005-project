import { and, desc, eq, or, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import {
  categories,
  courses,
  enrollments,
  LessonProgressStatus,
  lessonProgress,
  lessons,
  modules,
  quizAttempts,
  quizzes,
  users,
} from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

function getUserById(db: Db, id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

function getCourseWithDetails(db: Db, id: number) {
  const course = db
    .select({
      id: courses.id,
      title: courses.title,
      slug: courses.slug,
      description: courses.description,
      salesCopy: courses.salesCopy,
      instructorId: courses.instructorId,
      categoryId: courses.categoryId,
      status: courses.status,
      coverImageUrl: courses.coverImageUrl,
      price: courses.price,
      pppEnabled: courses.pppEnabled,
      createdAt: courses.createdAt,
      updatedAt: courses.updatedAt,
      instructorName: users.name,
      instructorAvatarUrl: users.avatarUrl,
      instructorBio: users.bio,
      categoryName: categories.name,
    })
    .from(courses)
    .innerJoin(users, eq(courses.instructorId, users.id))
    .innerJoin(categories, eq(courses.categoryId, categories.id))
    .where(eq(courses.id, id))
    .get();

  if (!course) return null;

  const courseModules = db
    .select()
    .from(modules)
    .where(eq(modules.courseId, id))
    .orderBy(modules.position)
    .all();

  const moduleIds = courseModules.map((m) => m.id);

  const courseLessons =
    moduleIds.length > 0
      ? db
          .select()
          .from(lessons)
          .where(or(...moduleIds.map((mid) => eq(lessons.moduleId, mid))))
          .orderBy(lessons.position)
          .all()
      : [];

  return {
    ...course,
    modules: courseModules.map((mod) => ({
      ...mod,
      lessons: courseLessons.filter((l) => l.moduleId === mod.id),
    })),
  };
}

function getLessonCountForCourse(db: Db, courseId: number) {
  const courseModules = db
    .select({ id: modules.id })
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .all();

  if (courseModules.length === 0) return 0;

  const count = db
    .select({ count: sql<number>`count(*)` })
    .from(lessons)
    .where(or(...courseModules.map((m) => eq(lessons.moduleId, m.id))))
    .get();

  return count?.count ?? 0;
}

export function getModuleById(db: Db, id: number) {
  return db.select().from(modules).where(eq(modules.id, id)).get();
}

export function getModulesByCourse(db: Db, courseId: number) {
  return db
    .select()
    .from(modules)
    .where(eq(modules.courseId, courseId))
    .orderBy(modules.position)
    .all();
}

export function getLessonById(db: Db, id: number) {
  return db.select().from(lessons).where(eq(lessons.id, id)).get();
}

export function getLessonsByModule(db: Db, moduleId: number) {
  return db
    .select()
    .from(lessons)
    .where(eq(lessons.moduleId, moduleId))
    .orderBy(lessons.position)
    .all();
}

function getEnrollmentCountForCourse(db: Db, courseId: number) {
  const result = db
    .select({ count: sql<number>`count(*)` })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .get();

  return result?.count ?? 0;
}

function getCourseEnrolledStudents(db: Db, courseId: number) {
  return db
    .select({
      enrollmentId: enrollments.id,
      userId: enrollments.userId,
      enrolledAt: enrollments.enrolledAt,
      completedAt: enrollments.completedAt,
    })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId))
    .all();
}

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

function calculateProgress(
  db: Db,
  userId: number,
  courseId: number,
  weightByDuration: boolean
) {
  const lessonIds = getCourseLessonIds(db, courseId);

  if (lessonIds.length === 0) return 0;

  if (weightByDuration) {
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

function getQuizByLessonId(db: Db, lessonId: number) {
  return db.select().from(quizzes).where(eq(quizzes.lessonId, lessonId)).get();
}

function getBestAttempt(db: Db, userId: number, quizId: number) {
  return db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.userId, userId), eq(quizAttempts.quizId, quizId))
    )
    .orderBy(desc(quizAttempts.score))
    .limit(1)
    .get();
}

export function getCourseEditorPage(db: Db, courseId: number) {
  const course = getCourseWithDetails(db, courseId);
  if (!course) return null;

  const lessonCount = getLessonCountForCourse(db, courseId);
  const enrollmentCount = getEnrollmentCountForCourse(db, courseId);

  // Student roster data
  const enrolledStudents = getCourseEnrolledStudents(db, courseId);

  // Gather all lessons from the course modules and find which have quizzes
  const allCourseLessons = course.modules.flatMap((mod) => mod.lessons);
  const lessonQuizzes: {
    lessonId: number;
    lessonTitle: string;
    quizId: number;
    quizTitle: string;
  }[] = [];
  for (const lesson of allCourseLessons) {
    const quiz = getQuizByLessonId(db, lesson.id);
    if (quiz) {
      lessonQuizzes.push({
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        quizId: quiz.id,
        quizTitle: quiz.title,
      });
    }
  }

  const students = enrolledStudents.map((enrollment) => {
    const studentUser = getUserById(db, enrollment.userId);
    const progress = calculateProgress(db, enrollment.userId, courseId, false);

    const quizScores = lessonQuizzes.map((lq) => {
      const bestAttempt = getBestAttempt(db, enrollment.userId, lq.quizId);
      return {
        quizId: lq.quizId,
        quizTitle: lq.quizTitle,
        lessonTitle: lq.lessonTitle,
        bestScore: bestAttempt?.score ?? null,
        passed: bestAttempt?.passed ?? null,
      };
    });

    return {
      userId: enrollment.userId,
      name: studentUser?.name ?? "Unknown",
      email: studentUser?.email ?? "",
      enrolledAt: enrollment.enrolledAt,
      completedAt: enrollment.completedAt,
      progress,
      quizScores,
    };
  });

  const quizCount = lessonQuizzes.length;

  return { course, lessonCount, enrollmentCount, students, quizCount };
}

export type CourseEditorPage = NonNullable<
  ReturnType<typeof getCourseEditorPage>
>;
