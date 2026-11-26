import { describe, it, expect } from "vitest";
import { createInstructorAnalytics } from "../index.server";
import {
  NOW,
  DAY_MS,
  db,
  instructor,
  course,
  addUser,
  addCourse,
  buy,
  asInstructor,
  setupAnalyticsFixtures,
} from "./fixtures";

setupAnalyticsFixtures();

describe("refund exposure", () => {
  it("adds up purchases still inside their refund window", () => {
    const secondCourse = addCourse(instructor.id, "Second Course");
    const student = addUser("Sam Student");
    buy(student.id, course.id, 10000, { daysBack: 3 });
    buy(student.id, course.id, 5000, { daysBack: 14 });
    buy(student.id, course.id, 4000, { daysBack: 15 });
    buy(student.id, secondCourse.id, 2000, { daysBack: 1 });

    expect(asInstructor({ range: "30d" }).refundExposure).toEqual({
      grossCents: 17000,
      netCents: 13600,
      purchaseCount: 3,
      sharePercent: 81,
      closingTodayCount: 1,
      courses: [
        {
          courseId: course.id,
          title: "Test Course",
          grossCents: 15000,
          purchaseCount: 2,
          daysLeft: 0,
        },
        {
          courseId: secondCourse.id,
          title: "Second Course",
          grossCents: 2000,
          purchaseCount: 1,
          daysLeft: 13,
        },
      ],
    });
  });

  it("keeps the fourteenth day open and closes the fifteenth", () => {
    const student = addUser("Sam Student");
    buy(student.id, course.id, 1000, { daysBack: 14 });
    buy(student.id, course.id, 2000, { daysBack: 15 });

    expect(asInstructor().refundExposure).toMatchObject({
      grossCents: 1000,
      closingTodayCount: 1,
    });
  });

  it("counts days left from today, with a purchase made today having fourteen", () => {
    buy(addUser("Sam Student").id, course.id, 1000, { daysBack: 0 });

    expect(asInstructor().refundExposure.courses[0].daysLeft).toBe(14);
  });

  it("only looks at purchases inside the selected range", () => {
    buy(addUser("Sam Student").id, course.id, 1000, { daysBack: 10 });

    expect(asInstructor({ range: "7d" }).refundExposure.grossCents).toBe(0);
    expect(asInstructor({ range: "30d" }).refundExposure.grossCents).toBe(1000);
  });

  it("is empty with no sales", () => {
    expect(asInstructor().refundExposure).toEqual({
      grossCents: 0,
      netCents: 0,
      purchaseCount: 0,
      sharePercent: 0,
      closingTodayCount: 0,
      courses: [],
    });
  });

  it("moves with the clock it is given", () => {
    buy(addUser("Sam Student").id, course.id, 1000, { daysBack: 3 });
    const aWeekLater = new Date(NOW.getTime() + 7 * DAY_MS);
    const twelveDaysLater = new Date(NOW.getTime() + 12 * DAY_MS);
    const viewer = { userId: instructor.id, isAdmin: false };
    const params = new URLSearchParams();

    expect(
      createInstructorAnalytics(db).get(viewer, params, aWeekLater)
        .refundExposure.courses[0].daysLeft
    ).toBe(4);
    expect(
      createInstructorAnalytics(db).get(viewer, params, twelveDaysLater)
        .refundExposure.grossCents
    ).toBe(0);
  });
});
