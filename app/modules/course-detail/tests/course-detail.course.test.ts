import { describe, it, expect } from "vitest";
import {
  addCourse,
  addLesson,
  addModule,
  addOtherCourseWithLesson,
  setup,
} from "./fixtures";

describe("getCourse", () => {
  it("returns null for a course that does not exist", () => {
    const { courseDetail } = setup();

    expect(courseDetail.getCourse(9999)).toBeNull();
  });

  it("joins the instructor and category", () => {
    const { courseDetail, course, instructor, category } = setup();

    const result = courseDetail.getCourse(course.id);

    expect(result).toMatchObject({
      id: course.id,
      title: "Test Course",
      instructorId: instructor.id,
      instructorName: "Test Instructor",
      categoryName: category.name,
      modules: [],
    });
  });

  it("orders modules and their lessons by position", () => {
    const { db, courseDetail, course } = setup();
    const second = addModule(db, {
      courseId: course.id,
      title: "Second",
      position: 2,
    });
    const first = addModule(db, {
      courseId: course.id,
      title: "First",
      position: 1,
    });
    addLesson(db, { moduleId: first.id, title: "B", position: 2 });
    addLesson(db, { moduleId: first.id, title: "A", position: 1 });
    addLesson(db, { moduleId: second.id, title: "C", position: 1 });

    const result = courseDetail.getCourse(course.id);

    expect(
      result?.modules.map((m) => ({
        title: m.title,
        lessons: m.lessons.map((l) => l.title),
      }))
    ).toEqual([
      { title: "First", lessons: ["A", "B"] },
      { title: "Second", lessons: ["C"] },
    ]);
  });
  it("gives a course with no modules no lessons from other courses", () => {
    const { db, courseDetail, course, instructor, category } = setup();
    addOtherCourseWithLesson(db, {
      instructorId: instructor.id,
      categoryId: category.id,
    });

    expect(courseDetail.getCourse(course.id)?.modules).toEqual([]);
    expect(courseDetail.getLessonCount(course.id)).toBe(0);
  });

  it("gives each module only its own lessons", () => {
    const { db, courseDetail, course, instructor, category } = setup();
    const mod = addModule(db, { courseId: course.id, title: "M", position: 1 });
    addLesson(db, { moduleId: mod.id, title: "Mine", position: 1 });
    addOtherCourseWithLesson(db, {
      instructorId: instructor.id,
      categoryId: category.id,
    });

    const result = courseDetail.getCourse(course.id);

    expect(result?.modules[0].lessons.map((l) => l.title)).toEqual(["Mine"]);
  });
});

describe("getLessonCount", () => {
  it("is zero for a course with no modules", () => {
    const { courseDetail, course } = setup();

    expect(courseDetail.getLessonCount(course.id)).toBe(0);
  });

  it("counts lessons across every module of this course only", () => {
    const { db, courseDetail, course, instructor, category } = setup();
    const a = addModule(db, { courseId: course.id, title: "A", position: 1 });
    const b = addModule(db, { courseId: course.id, title: "B", position: 2 });
    addLesson(db, { moduleId: a.id, title: "1", position: 1 });
    addLesson(db, { moduleId: a.id, title: "2", position: 2 });
    addLesson(db, { moduleId: b.id, title: "3", position: 1 });
    const other = addCourse(db, instructor.id, category.id);
    const x = addModule(db, { courseId: other.id, title: "X", position: 1 });
    addLesson(db, { moduleId: x.id, title: "4", position: 1 });

    expect(courseDetail.getLessonCount(course.id)).toBe(3);
  });
});

describe("getRefundOffer", () => {
  it("is null for someone who never bought the course", () => {
    const { courseDetail, course, user } = setup();

    expect(
      courseDetail.getRefundOffer(user.id, course.id, new Date())
    ).toBeNull();
  });
});
