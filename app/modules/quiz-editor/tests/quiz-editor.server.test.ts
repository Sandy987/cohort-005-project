import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData, type TestDb } from "~/test/setup";
import * as schema from "~/db/schema";
import { QuestionType } from "~/db/schema";
import {
  createQuizEditor,
  parseWizardData,
  quizActionSchema,
  type WizardData,
} from "../index.server";

let db: TestDb;
let editor: ReturnType<typeof createQuizEditor>;
let studentId: number;
let lessonId: number;

// Modules, lessons and attempts belong to other features with no module yet,
// so those rows go in directly.
beforeEach(() => {
  db = createTestDb();
  const base = seedBaseData(db);
  studentId = base.user.id;
  const mod = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Module 1", position: 1 })
    .returning()
    .get();
  lessonId = db
    .insert(schema.lessons)
    .values({ moduleId: mod.id, title: "Lesson 1", position: 1 })
    .returning()
    .get().id;
  editor = createQuizEditor(db);
});

function wizard(overrides: Partial<WizardData> = {}): WizardData {
  return {
    title: "  Basics Quiz  ",
    passingScore: 70,
    questions: [
      {
        id: "q1",
        text: " What is 2 + 2? ",
        type: QuestionType.MultipleChoice,
        options: [
          { id: "o1", text: " 4 ", isCorrect: true },
          { id: "o2", text: "5", isCorrect: false },
        ],
      },
      {
        id: "q2",
        text: "The sky is blue.",
        type: QuestionType.TrueFalse,
        options: [
          { id: "o3", text: "True", isCorrect: true },
          { id: "o4", text: "False", isCorrect: false },
        ],
      },
    ],
    ...overrides,
  };
}

// An attempt with no answers. Deleting a quiz whose attempts have answers
// fails on a foreign key today: options go before the answers that point at
// them. That is a known bug, left for its own ticket.
function addAttempt() {
  const quiz = editor.getEditorData(lessonId)?.existingQuiz;
  if (!quiz) throw new Error("Save a quiz before attempting it.");
  const quizId = quiz.id;
  db.insert(schema.quizAttempts)
    .values({ userId: studentId, quizId, score: 1, passed: true })
    .run();
}

describe("getEditorData", () => {
  it("returns the lesson and its module with no quiz", () => {
    const result = editor.getEditorData(lessonId);
    expect(result?.lesson.title).toBe("Lesson 1");
    expect(result?.module.title).toBe("Module 1");
    expect(result?.existingQuiz).toBeNull();
  });

  it("returns null for a lesson that does not exist", () => {
    expect(editor.getEditorData(9999)).toBeNull();
  });

  it("returns the saved quiz with its questions in order and their options", () => {
    editor.saveQuiz(lessonId, wizard());
    const quiz = editor.getEditorData(lessonId)?.existingQuiz;
    expect(quiz?.title).toBe("Basics Quiz");
    expect(quiz?.passingScore).toBeCloseTo(0.7);
    expect(quiz?.questions.map((q) => [q.position, q.questionText])).toEqual([
      [1, "What is 2 + 2?"],
      [2, "The sky is blue."],
    ]);
    expect(quiz?.questions[0].questionType).toBe(QuestionType.MultipleChoice);
    expect(
      quiz?.questions[0].options.map((o) => [o.optionText, o.isCorrect])
    ).toEqual([
      ["4", true],
      ["5", false],
    ]);
  });
});

describe("saveQuiz", () => {
  it("replaces the lesson's quiz and drops attempts at the old one", () => {
    editor.saveQuiz(lessonId, wizard());
    const first = editor.getEditorData(lessonId)?.existingQuiz;
    addAttempt();

    editor.saveQuiz(lessonId, wizard({ title: "Second" }));

    const second = editor.getEditorData(lessonId)?.existingQuiz;
    expect(second?.title).toBe("Second");
    expect(second?.id).not.toBe(first?.id);
    expect(db.select().from(schema.quizzes).all()).toHaveLength(1);
    expect(db.select().from(schema.quizAttempts).all()).toHaveLength(0);
    expect(db.select().from(schema.quizQuestions).all()).toHaveLength(2);
    expect(db.select().from(schema.quizOptions).all()).toHaveLength(4);
  });
});

describe("deleteQuiz", () => {
  it("deletes the quiz with its questions, options and attempts", () => {
    editor.saveQuiz(lessonId, wizard());
    addAttempt();

    editor.deleteQuiz(lessonId);

    expect(editor.getEditorData(lessonId)?.existingQuiz).toBeNull();
    for (const table of [
      schema.quizzes,
      schema.quizQuestions,
      schema.quizOptions,
      schema.quizAttempts,
    ]) {
      expect(db.select().from(table).all()).toHaveLength(0);
    }
  });

  it("does nothing when the lesson has no quiz", () => {
    expect(() => editor.deleteQuiz(lessonId)).not.toThrow();
  });
});

describe("parseWizardData", () => {
  it("parses valid wizard JSON, trimming the title", () => {
    expect(parseWizardData(JSON.stringify(wizard()))).toEqual(
      wizard({ title: "Basics Quiz" })
    );
  });

  it("returns null for malformed JSON", () => {
    expect(parseWizardData("{not json")).toBeNull();
  });

  it("returns null for a blank title", () => {
    expect(parseWizardData(JSON.stringify(wizard({ title: "  " })))).toBe(null);
  });

  it("returns null with no questions", () => {
    expect(
      parseWizardData(JSON.stringify(wizard({ questions: [] })))
    ).toBeNull();
  });

  it("returns null for an unknown question type", () => {
    const data = wizard();
    const bad = { ...data, questions: [{ ...data.questions[0], type: "x" }] };
    expect(parseWizardData(JSON.stringify(bad))).toBeNull();
  });
});

describe("quizActionSchema", () => {
  it("accepts save-quiz with wizard data and delete-quiz", () => {
    expect(
      quizActionSchema.safeParse({ intent: "save-quiz", wizardData: "{}" })
        .success
    ).toBe(true);
    expect(quizActionSchema.safeParse({ intent: "delete-quiz" }).success).toBe(
      true
    );
  });

  it("rejects an unknown intent and save-quiz without data", () => {
    expect(quizActionSchema.safeParse({ intent: "nope" }).success).toBe(false);
    expect(quizActionSchema.safeParse({ intent: "save-quiz" }).success).toBe(
      false
    );
  });
});
