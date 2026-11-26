import { describe, it, expect, beforeEach } from "vitest";
import {
  course,
  otherCourse,
  addUser,
  addModule,
  addLesson,
  buy,
  addQuiz,
  attempt,
  asInstructor,
  setupAnalyticsFixtures,
} from "./fixtures";

setupAnalyticsFixtures();

describe("quiz pass rates", () => {
  let lesson1: number;
  let lesson3: number;

  beforeEach(() => {
    const first = addModule(course.id, "Basics", 1);
    const second = addModule(course.id, "Advanced", 2);
    lesson1 = addLesson(first.id, "Lesson 1", 1).id;
    lesson3 = addLesson(second.id, "Lesson 3", 1).id;
  });

  function quizzes(params: Record<string, string> = {}) {
    return asInstructor({ course: String(course.id), ...params }).quizzes;
  }

  it("judges each student by their best attempt", () => {
    const quiz = addQuiz(lesson1, "Basics Quiz", 0.7);
    const improver = addUser("Improver");
    const struggler = addUser("Struggler");
    attempt(improver.id, quiz.id, 0.5, false);
    attempt(improver.id, quiz.id, 0.9, true);
    attempt(struggler.id, quiz.id, 0.6, false);

    expect(quizzes()).toEqual([
      {
        quizId: quiz.id,
        title: "Basics Quiz",
        moduleTitle: "Basics",
        lessonTitle: "Lesson 1",
        passingScorePercent: 70,
        studentCount: 2,
        passedCount: 1,
        passRatePercent: 50,
        averageBestScorePercent: 75,
      },
    ]);
  });

  it("trusts the verdict recorded on the best attempt", () => {
    // Failed under an older, stricter pass mark; not re-judged now.
    const quiz = addQuiz(lesson1, "Basics Quiz", 0.7);
    attempt(addUser("Student").id, quiz.id, 0.72, false);

    expect(quizzes()?.[0]).toMatchObject({
      passedCount: 0,
      passRatePercent: 0,
    });
  });

  it("lists quizzes in curriculum order, including unattempted ones", () => {
    const later = addQuiz(lesson3, "Advanced Quiz", 0.8);
    const earlier = addQuiz(lesson1, "Basics Quiz", 0.7);

    expect(quizzes()?.map((quiz) => quiz.quizId)).toEqual([
      earlier.id,
      later.id,
    ]);
    expect(quizzes()?.[1]).toMatchObject({
      studentCount: 0,
      passedCount: 0,
      passRatePercent: null,
      averageBestScorePercent: null,
    });
  });

  it("only counts attempts inside the range", () => {
    const quiz = addQuiz(lesson3, "Advanced Quiz", 0.8);
    attempt(addUser("Student").id, quiz.id, 0.85, true, 40);

    expect(quizzes({ range: "30d" })?.[0].studentCount).toBe(0);
    expect(quizzes({ range: "all" })?.[0]).toMatchObject({
      studentCount: 1,
      passRatePercent: 100,
      averageBestScorePercent: 85,
    });
  });

  it("is empty for a course without quizzes", () => {
    expect(quizzes()).toEqual([]);
  });
});

describe("revenue by country", () => {
  function countries(params: Record<string, string> = {}) {
    return asInstructor({ course: String(course.id), ...params }).countries;
  }

  it("breaks sales down by country, biggest first, with parity discounts", () => {
    const student = addUser("Student");
    buy(student.id, course.id, 10000, { country: "US" });
    buy(student.id, course.id, 10000, { country: "US" });
    buy(student.id, course.id, 8000, { country: null });
    buy(student.id, course.id, 5000, { country: "IN" });
    buy(student.id, course.id, 3000, { country: "NG" });

    expect(countries()).toEqual({
      grossCents: 36000,
      netCents: 28800,
      purchaseCount: 5,
      discountedGrossCents: 8000,
      discountedNetCents: 6400,
      discountedSharePercent: 22,
      rows: [
        {
          country: "US",
          purchaseCount: 2,
          grossCents: 20000,
          netCents: 16000,
          sharePercent: 56,
          averagePaidCents: 10000,
          discountPercent: 0,
        },
        {
          country: null,
          purchaseCount: 1,
          grossCents: 8000,
          netCents: 6400,
          sharePercent: 22,
          averagePaidCents: 8000,
          discountPercent: null,
        },
        {
          country: "IN",
          purchaseCount: 1,
          grossCents: 5000,
          netCents: 4000,
          sharePercent: 14,
          averagePaidCents: 5000,
          discountPercent: 50,
        },
        {
          country: "NG",
          purchaseCount: 1,
          grossCents: 3000,
          netCents: 2400,
          sharePercent: 8,
          averagePaidCents: 3000,
          discountPercent: 70,
        },
      ],
    });
  });

  it("only counts this course's sales inside the range", () => {
    const student = addUser("Student");
    buy(student.id, course.id, 1000, { daysBack: 2 });
    buy(student.id, course.id, 2000, { daysBack: 40 });
    buy(student.id, otherCourse.id, 4000, { daysBack: 2 });

    expect(countries({ range: "30d" })?.grossCents).toBe(1000);
    expect(countries({ range: "all" })?.grossCents).toBe(3000);
  });

  it("is all zeroes with no sales", () => {
    expect(countries()).toEqual({
      grossCents: 0,
      netCents: 0,
      purchaseCount: 0,
      discountedGrossCents: 0,
      discountedNetCents: 0,
      discountedSharePercent: 0,
      rows: [],
    });
  });
});
