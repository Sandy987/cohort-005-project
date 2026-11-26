import { db } from "~/db";
import {
  applyCourseEditorAction,
  type CourseEditorAction,
  type EditedCourse,
} from "./lib/actions";
import { getCourseEditorPage, type Db } from "./lib/queries";

export { courseEditorActionSchema } from "./lib/actions";
export type {
  CourseEditorAction,
  CourseEditorActionResult,
  EditedCourse,
} from "./lib/actions";
export type { CourseEditorPage } from "./lib/queries";

/**
 * The instructor's course editor bound to a database. The app uses
 * `courseEditor`, which reads the app database; tests build their own
 * against a test database.
 *
 * Neither method checks permission: the caller has already decided the
 * Person may manage the course.
 */
export function createCourseEditor(database: Db) {
  return {
    /**
     * Everything the course editor page shows: the course with its modules
     * and lessons, lesson and enrollment counts, and the student roster with
     * each student's progress and best quiz scores. `null` when the course
     * doesn't exist.
     */
    getPage(courseId: number) {
      return getCourseEditorPage(database, courseId);
    },

    /**
     * Applies one parsed editor action (see `courseEditorActionSchema`) to
     * the course. Returns `{ success, field }`, or `{ error, status }` when
     * the price is out of range or a module or lesson named in the action
     * isn't in this course.
     */
    apply(course: EditedCourse, action: CourseEditorAction) {
      return applyCourseEditorAction(database, course, action);
    },
  };
}

// Pure so a route importing this only for its loader doesn't pull the
// database into the client bundle (see `~/db`).
export const courseEditor = /* @__PURE__ */ createCourseEditor(db);
