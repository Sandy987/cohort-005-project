import { describe, it, expect, beforeEach } from "vitest";
import { LessonProgressStatus } from "~/db/schema";
import {
  instructor,
  course,
  otherCourse,
  addUser,
  addCourse,
  addModule,
  addLesson,
  enroll,
  progress,
  asInstructor,
  setupAnalyticsFixtures,
} from "./fixtures";

setupAnalyticsFixtures();

describe("course progress", () => {
  let lessonIds: number[];

  beforeEach(() => {
    const first = addModule(course.id, "Basics", 1);
    const second = addModule(course.id, "Advanced", 2);
    lessonIds = [
      addLesson(first.id, "Lesson 1", 1).id,
      addLesson(first.id, "Lesson 2", 2).id,
      addLesson(second.id, "Lesson 3", 1).id,
    ];
  });

  function courseTab(params: Record<string, string> = {}) {
    return asInstructor({
      tab: "course",
      course: String(course.id),
      ...params,
    });
  }

  it("averages completion across every enrollee, including those who never started", () => {
    const finisher = addUser("Finisher");
    const starter = addUser("Starter");
    const vanished = addUser("Vanished");
    for (const student of [finisher, starter, vanished]) {
      enroll(student.id, course.id);
    }
    for (const lessonId of lessonIds) {
      progress(finisher.id, lessonId, LessonProgressStatus.Completed);
    }
    progress(starter.id, lessonIds[0], LessonProgressStatus.Completed);
    progress(starter.id, lessonIds[1], LessonProgressStatus.InProgress);

    // (100 + 33⅓ + 0) / 3
    expect(courseTab().progress).toEqual({
      enrolledCount: 3,
      totalLessons: 3,
      averageProgressPercent: 44,
      finishedCount: 1,
    });
  });

  it("ignores progress on other courses' lessons", () => {
    const student = addUser("Student");
    enroll(student.id, course.id);
    const elsewhere = addModule(otherCourse.id, "Elsewhere", 1);
    progress(
      student.id,
      addLesson(elsewhere.id, "Their lesson", 1).id,
      LessonProgressStatus.Completed
    );

    expect(courseTab().progress?.averageProgressPercent).toBe(0);
  });

  it("spans all time whatever the range", () => {
    enroll(addUser("Long Ago").id, course.id, 300);

    expect(courseTab({ range: "7d" }).progress?.enrolledCount).toBe(1);
  });

  it("has no average with nobody enrolled", () => {
    expect(courseTab().progress).toEqual({
      enrolledCount: 0,
      totalLessons: 3,
      averageProgressPercent: null,
      finishedCount: 0,
    });
  });

  it("has no average for a course without lessons", () => {
    const empty = addCourse(instructor.id, "Empty Course");
    enroll(addUser("Student").id, empty.id);

    expect(asInstructor({ course: String(empty.id) }).progress).toEqual({
      enrolledCount: 1,
      totalLessons: 0,
      averageProgressPercent: null,
      finishedCount: 0,
    });
  });
});

describe("drop-off funnel", () => {
  let lessonIds: number[];
  let firstModuleId: number;
  let secondModuleId: number;

  beforeEach(() => {
    // Inserted out of order: the funnel follows position, not id.
    secondModuleId = addModule(course.id, "Advanced", 2).id;
    firstModuleId = addModule(course.id, "Basics", 1).id;
    const lesson3 = addLesson(secondModuleId, "Lesson 3", 1).id;
    const lesson2 = addLesson(firstModuleId, "Lesson 2", 2).id;
    const lesson1 = addLesson(firstModuleId, "Lesson 1", 1).id;
    lessonIds = [lesson1, lesson2, lesson3];
  });

  function funnel() {
    return asInstructor({ course: String(course.id) }).funnel;
  }

  it("counts each student as reaching every lesson up to their furthest", () => {
    const [lesson1, lesson2, lesson3] = lessonIds;
    // Skipped straight to the end: still counted as passing through 1 and 2.
    const skipper = addUser("Skipper");
    const steady = addUser("Steady");
    const quitter = addUser("Quitter");
    const neverStarted = addUser("Never Started");
    const opened = addUser("Opened Only");
    for (const student of [skipper, steady, quitter, neverStarted, opened]) {
      enroll(student.id, course.id);
    }
    progress(skipper.id, lesson3, LessonProgressStatus.InProgress);
    progress(steady.id, lesson1, LessonProgressStatus.Completed);
    progress(steady.id, lesson2, LessonProgressStatus.Completed);
    progress(quitter.id, lesson1, LessonProgressStatus.InProgress);
    progress(opened.id, lesson1, LessonProgressStatus.NotStarted);

    expect(funnel()).toEqual({
      enrolledCount: 5,
      modules: [
        {
          moduleId: firstModuleId,
          title: "Basics",
          reachedCount: 3,
          dropWithin: 1,
          lessons: [
            {
              lessonId: lesson1,
              title: "Lesson 1",
              reachedCount: 3,
              dropFromPrevious: 2,
            },
            {
              lessonId: lesson2,
              title: "Lesson 2",
              reachedCount: 2,
              dropFromPrevious: 1,
            },
          ],
        },
        {
          moduleId: secondModuleId,
          title: "Advanced",
          reachedCount: 1,
          dropWithin: 0,
          lessons: [
            {
              lessonId: lesson3,
              title: "Lesson 3",
              reachedCount: 1,
              dropFromPrevious: 1,
            },
          ],
        },
      ],
    });
  });

  it("ignores progress from someone not enrolled", () => {
    progress(
      addUser("Tourist").id,
      lessonIds[2],
      LessonProgressStatus.Completed
    );

    const result = funnel();

    expect(result?.enrolledCount).toBe(0);
    expect(result?.modules.map((module) => module.reachedCount)).toEqual([
      0, 0,
    ]);
  });

  it("ignores progress from someone enrolled only on a different course", () => {
    const tourist = addUser("Tourist");
    enroll(tourist.id, otherCourse.id);
    progress(tourist.id, lessonIds[2], LessonProgressStatus.Completed);

    expect(funnel()?.modules.map((module) => module.reachedCount)).toEqual([
      0, 0,
    ]);
  });

  it("has no modules for a course without lessons", () => {
    const empty = addCourse(instructor.id, "Empty Course");
    enroll(addUser("Student").id, empty.id);

    expect(asInstructor({ course: String(empty.id) }).funnel).toEqual({
      enrolledCount: 1,
      modules: [],
    });
  });
});
