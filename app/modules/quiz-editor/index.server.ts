import { db } from "~/db";
import {
  deleteQuizForLesson,
  getEditorData,
  saveQuiz,
} from "./lib/quiz-editor";
import type { Db } from "./lib/quiz-store";
import type { WizardData } from "./lib/wizard-schema";

export { parseWizardData, quizActionSchema } from "./lib/wizard-schema";
export type { WizardData } from "./lib/wizard-schema";

/**
 * The instructor quiz editor bound to a database. The app uses `quizEditor`,
 * which reads the app database; tests build their own against a test database.
 */
export function createQuizEditor(database: Db) {
  return {
    /** The lesson, its module and its quiz, or null when the lesson is gone. */
    getEditorData(lessonId: number) {
      return getEditorData(database, lessonId);
    },
    /** Replaces the lesson's quiz, and every attempt at it, with this one. */
    saveQuiz(lessonId: number, wizardData: WizardData) {
      saveQuiz(database, lessonId, wizardData);
    },
    /** Deletes the lesson's quiz and every attempt at it, if it has one. */
    deleteQuiz(lessonId: number) {
      deleteQuizForLesson(database, lessonId);
    },
  };
}

// Pure so a route importing this only for its loader and action doesn't pull
// the database into the client bundle (see `~/db`).
export const quizEditor = /* @__PURE__ */ createQuizEditor(db);
