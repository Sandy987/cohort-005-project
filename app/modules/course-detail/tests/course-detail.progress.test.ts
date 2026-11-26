import { describe, it, expect } from "vitest";
import { LessonProgressStatus } from "~/db/schema";
import {
  addLesson,
  addModule,
  addOtherCourseWithLesson,
  markLesson,
  setup,
} from "./fixtures";

function courseWithLessons() {
  const context = setup();
  const first = addModule(context.db, {
    courseId: context.course.id,
    title: "First",
    position: 1,
  });
  const second = addModule(context.db, {
    courseId: context.course.id,
    title: "Second",
    position: 2,
  });
  const lessons = [
    addLesson(context.db, { moduleId: first.id, title: "L1", position: 1 }),
    addLesson(context.db, { moduleId: first.id, title: "L2", position: 2 }),
    addLesson(context.db, { moduleId: second.id, title: "L3", position: 1 }),
    addLesson(context.db, { moduleId: second.id, title: "L4", position: 2 }),
  ];
  return { ...context, lessons };
}

describe("getLearnerProgress", () => {
  it("reports nothing for a course with no lessons", () => {
    const { courseDetail, course, user } = setup();

    expect(courseDetail.getLearnerProgress(user.id, course.id)).toEqual({
      progress: 0,
      lessonProgressMap: {},
      nextLessonId: null,
    });
  });

  it("starts a new learner at the first lesson", () => {
    const { courseDetail, course, user, lessons } = courseWithLessons();

    expect(courseDetail.getLearnerProgress(user.id, course.id)).toEqual({
      progress: 0,
      lessonProgressMap: {},
      nextLessonId: lessons[0].id,
    });
  });

  it("counts only completed lessons toward the percentage", () => {
    const { db, courseDetail, course, user, lessons } = courseWithLessons();
    markLesson(db, {
      userId: user.id,
      lessonId: lessons[0].id,
      status: LessonProgressStatus.Completed,
    });
    markLesson(db, {
      userId: user.id,
      lessonId: lessons[1].id,
      status: LessonProgressStatus.InProgress,
    });

    const result = courseDetail.getLearnerProgress(user.id, course.id);

    expect(result.progress).toBe(25);
    expect(result.lessonProgressMap).toEqual({
      [lessons[0].id]: LessonProgressStatus.Completed,
      [lessons[1].id]: LessonProgressStatus.InProgress,
    });
    expect(result.nextLessonId).toBe(lessons[1].id);
  });

  it("points at the first incomplete lesson in a later module", () => {
    const { db, courseDetail, course, user, lessons } = courseWithLessons();
    markLesson(db, {
      userId: user.id,
      lessonId: lessons[0].id,
      status: LessonProgressStatus.Completed,
    });
    markLesson(db, {
      userId: user.id,
      lessonId: lessons[1].id,
      status: LessonProgressStatus.Completed,
    });

    const result = courseDetail.getLearnerProgress(user.id, course.id);

    expect(result.progress).toBe(50);
    expect(result.nextLessonId).toBe(lessons[2].id);
  });

  it("has no next lesson once every lesson is complete", () => {
    const { db, courseDetail, course, user, lessons } = courseWithLessons();
    for (const lesson of lessons) {
      markLesson(db, {
        userId: user.id,
        lessonId: lesson.id,
        status: LessonProgressStatus.Completed,
      });
    }

    const result = courseDetail.getLearnerProgress(user.id, course.id);

    expect(result.progress).toBe(100);
    expect(result.nextLessonId).toBeNull();
  });

  it("ignores another learner's progress", () => {
    const { db, courseDetail, course, user, instructor, lessons } =
      courseWithLessons();
    markLesson(db, {
      userId: instructor.id,
      lessonId: lessons[0].id,
      status: LessonProgressStatus.Completed,
    });

    const result = courseDetail.getLearnerProgress(user.id, course.id);

    expect(result.progress).toBe(0);
    expect(result.lessonProgressMap).toEqual({});
    expect(result.nextLessonId).toBe(lessons[0].id);
  });

  it("ignores progress in other courses when this course has no lessons", () => {
    const { db, courseDetail, course, user, instructor, category } = setup();
    const other = addOtherCourseWithLesson(db, {
      instructorId: instructor.id,
      categoryId: category.id,
    });
    markLesson(db, {
      userId: user.id,
      lessonId: other.lesson.id,
      status: LessonProgressStatus.Completed,
    });

    expect(courseDetail.getLearnerProgress(user.id, course.id)).toStrictEqual({
      progress: 0,
      lessonProgressMap: {},
      nextLessonId: null,
    });

    addModule(db, { courseId: course.id, title: "Empty", position: 1 });

    expect(courseDetail.getLearnerProgress(user.id, course.id)).toStrictEqual({
      progress: 0,
      lessonProgressMap: {},
      nextLessonId: null,
    });
  });

  it("ignores progress in other courses alongside this one's", () => {
    const { db, courseDetail, course, user, instructor, category, lessons } =
      courseWithLessons();
    const other = addOtherCourseWithLesson(db, {
      instructorId: instructor.id,
      categoryId: category.id,
    });
    markLesson(db, {
      userId: user.id,
      lessonId: other.lesson.id,
      status: LessonProgressStatus.Completed,
    });
    markLesson(db, {
      userId: user.id,
      lessonId: lessons[0].id,
      status: LessonProgressStatus.Completed,
    });

    const result = courseDetail.getLearnerProgress(user.id, course.id);

    expect(result.progress).toBe(25);
    expect(result.lessonProgressMap).toStrictEqual({
      [lessons[0].id]: LessonProgressStatus.Completed,
    });
  });

  it("counts lessons equally, whatever their duration", () => {
    const { db, courseDetail, course, user } = setup();
    const mod = addModule(db, { courseId: course.id, title: "M", position: 1 });
    const short = addLesson(db, {
      moduleId: mod.id,
      title: "Short",
      position: 1,
      durationMinutes: 10,
    });
    addLesson(db, {
      moduleId: mod.id,
      title: "Long",
      position: 2,
      durationMinutes: 30,
    });
    markLesson(db, {
      userId: user.id,
      lessonId: short.id,
      status: LessonProgressStatus.Completed,
    });

    expect(courseDetail.getLearnerProgress(user.id, course.id).progress).toBe(
      50
    );
  });
});
