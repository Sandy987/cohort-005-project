import { db } from "~/db";
import { getRefundOffer } from "~/lib/refunds.server";
import {
  getCourseWithDetails,
  getLessonCountForCourse,
} from "./lib/course-details";
import type { Db } from "./lib/db";
import { getLearnerProgress } from "./lib/progress";
import { findRating, getCourseRatingSummary, rateCourse } from "./lib/ratings";

export type { CourseRatingSummary } from "./lib/ratings";

/**
 * The data behind the public course page, bound to a database. The app uses
 * `courseDetail`, which reads the app database; tests build their own
 * against a test database.
 */
export function createCourseDetail(database: Db) {
  return {
    /** The course with its instructor, category, modules and lessons, or null. */
    getCourse(courseId: number) {
      return getCourseWithDetails(database, courseId);
    },

    getLessonCount(courseId: number) {
      return getLessonCountForCourse(database, courseId);
    },

    /**
     * How far a learner is through the course: percent of lessons completed,
     * each lesson's status, and the first lesson they have not completed.
     */
    getLearnerProgress(userId: number, courseId: number) {
      return getLearnerProgress(database, userId, courseId);
    },

    getRatingSummary(courseId: number) {
      return getCourseRatingSummary(database, courseId);
    },

    /** The rating this person gave the course, or null if they have not. */
    getUserRating(userId: number, courseId: number) {
      return findRating(database, userId, courseId)?.rating ?? null;
    },

    /** Records a rating, replacing the person's earlier one. Throws when out of range. */
    rate(userId: number, courseId: number, rating: number) {
      return rateCourse(database, { userId, courseId, rating });
    },

    getRefundOffer(buyerId: number, courseId: number, now: Date) {
      return getRefundOffer(database, buyerId, courseId, now);
    },
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const courseDetail = /* @__PURE__ */ createCourseDetail(db);
