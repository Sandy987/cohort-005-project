import { describe, it, expect } from "vitest";
import { addCourse, setup } from "./fixtures";

describe("ratings", () => {
  it("has an empty summary and no user rating before anyone rates", () => {
    const { courseDetail, course, user } = setup();

    expect(courseDetail.getRatingSummary(course.id)).toEqual({
      average: null,
      count: 0,
    });
    expect(courseDetail.getUserRating(user.id, course.id)).toBeNull();
  });

  it("averages ratings to one decimal place", () => {
    const { courseDetail, course, user, instructor } = setup();
    courseDetail.rate(user.id, course.id, 5);
    courseDetail.rate(instructor.id, course.id, 4);

    expect(courseDetail.getRatingSummary(course.id)).toEqual({
      average: 4.5,
      count: 2,
    });
    expect(courseDetail.getUserRating(user.id, course.id)).toBe(5);
  });

  it("replaces a person's earlier rating rather than adding another", () => {
    const { courseDetail, course, user } = setup();
    courseDetail.rate(user.id, course.id, 2);
    courseDetail.rate(user.id, course.id, 4);

    expect(courseDetail.getRatingSummary(course.id)).toEqual({
      average: 4,
      count: 1,
    });
    expect(courseDetail.getUserRating(user.id, course.id)).toBe(4);
  });

  it.each([0, 6, 2.5])("rejects a rating of %s", (rating) => {
    const { courseDetail, course, user } = setup();

    expect(() => courseDetail.rate(user.id, course.id, rating)).toThrow(
      /whole number between 1 and 5/
    );
  });

  it("rejects a rating for a course that does not exist", () => {
    const { courseDetail, user } = setup();

    expect(() => courseDetail.rate(user.id, 9999, 3)).toThrow(
      "Course not found"
    );
  });

  it.each([1, 5])("accepts a rating of %s", (rating) => {
    const { courseDetail, course, user } = setup();

    courseDetail.rate(user.id, course.id, rating);

    expect(courseDetail.getUserRating(user.id, course.id)).toBe(rating);
  });

  it("summarises only this course's ratings", () => {
    const { db, courseDetail, course, user, instructor, category } = setup();
    const other = addCourse(db, instructor.id, category.id);
    courseDetail.rate(user.id, other.id, 1);
    courseDetail.rate(user.id, course.id, 5);

    expect(courseDetail.getRatingSummary(course.id)).toEqual({
      average: 5,
      count: 1,
    });
  });
});
