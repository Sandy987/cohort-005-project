import { describe, it, expect } from "vitest";
import {
  addCourse,
  addLesson,
  addModule,
  addQuiz,
  addStudent,
  attemptQuiz,
  completeLesson,
  enroll,
  setUp,
} from "./fixtures";

describe("courseEditor.getPage", () => {
  it("is null for a course that doesn't exist", () => {
    const { editor } = setUp();

    expect(editor.getPage(9999)).toBeNull();
  });

  it("shows the course with its instructor and category, and no content yet", () => {
    const { editor, course } = setUp();

    const page = editor.getPage(course.id);

    expect(page).toMatchObject({
      course: {
        id: course.id,
        title: "Test Course",
        instructorName: "Test Instructor",
        categoryName: "Programming",
        modules: [],
      },
      lessonCount: 0,
      enrollmentCount: 0,
      students: [],
      quizCount: 0,
    });
  });

  it("lists modules and their lessons in position order and counts the lessons", () => {
    const { editor, course } = setUp();
    const intro = addModule(editor, course, "Intro");
    const advanced = addModule(editor, course, "Advanced");
    addLesson(editor, course, advanced.id)("Generics");
    addLesson(editor, course, intro.id)("Setup");
    addLesson(editor, course, intro.id)("Hello world");

    const page = editor.getPage(course.id);

    expect(
      page?.course.modules.map((m) => [m.title, m.lessons.map((l) => l.title)])
    ).toEqual([
      ["Intro", ["Setup", "Hello world"]],
      ["Advanced", ["Generics"]],
    ]);
    expect(page?.lessonCount).toBe(3);
  });

  it("leaves out another course's modules and enrollments", () => {
    const { db, editor, course, instructor, category, user } = setUp();
    const other = addCourse(db, instructor.id, category.id);
    addLesson(editor, other, addModule(editor, other, "Elsewhere").id)("Nope");
    enroll(db, { userId: user.id, courseId: other.id });

    const page = editor.getPage(course.id);

    expect(page?.course.modules).toEqual([]);
    expect(page?.lessonCount).toBe(0);
    expect(page?.enrollmentCount).toBe(0);
  });

  it("shows each enrolled student's progress through the course", () => {
    const { db, editor, course } = setUp();
    const mod = addModule(editor, course, "Intro");
    const lessons = ["One", "Two", "Three"].map(
      addLesson(editor, course, mod.id)
    );
    const done = addStudent(db, "Dana Done");
    const half = addStudent(db, "Hal Half");
    enroll(db, {
      userId: done.id,
      courseId: course.id,
      completedAt: "2026-01-02T00:00:00.000Z",
    });
    enroll(db, { userId: half.id, courseId: course.id });
    for (const lesson of lessons) {
      completeLesson(db, { userId: done.id, lessonId: lesson.id });
    }
    completeLesson(db, { userId: half.id, lessonId: lessons[0].id });

    const page = editor.getPage(course.id);

    expect(page?.enrollmentCount).toBe(2);
    expect(
      page?.students.map((s) => [s.name, s.email, s.progress, s.completedAt])
    ).toEqual([
      ["Dana Done", done.email, 100, "2026-01-02T00:00:00.000Z"],
      ["Hal Half", half.email, 33, null],
    ]);
  });

  it("shows each student's best score on every quiz in the course", () => {
    const { db, editor, course } = setUp();
    const mod = addModule(editor, course, "Intro");
    const [first, second] = ["One", "Two"].map(
      addLesson(editor, course, mod.id)
    );
    const quizOne = addQuiz(db, first.id, "Quiz one");
    addQuiz(db, second.id, "Quiz two");
    const student = addStudent(db, "Sam Student");
    enroll(db, { userId: student.id, courseId: course.id });
    attemptQuiz(db, {
      userId: student.id,
      quizId: quizOne.id,
      score: 0.5,
      passed: false,
    });
    attemptQuiz(db, {
      userId: student.id,
      quizId: quizOne.id,
      score: 0.9,
      passed: true,
    });

    const page = editor.getPage(course.id);

    expect(page?.quizCount).toBe(2);
    expect(page?.students[0].quizScores).toEqual([
      {
        quizId: quizOne.id,
        quizTitle: "Quiz one",
        lessonTitle: "One",
        bestScore: 0.9,
        passed: true,
      },
      {
        quizId: expect.any(Number),
        quizTitle: "Quiz two",
        lessonTitle: "Two",
        bestScore: null,
        passed: null,
      },
    ]);
  });
});
