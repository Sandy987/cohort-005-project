import { describe, it, expect } from "vitest";
import { QuestionType } from "~/db/schema";
import {
  addOption,
  addQuestion,
  canGoNext,
  getValidationErrors,
  initialWizard,
  moveQuestion,
  removeOption,
  removeQuestion,
  setCorrectOption,
  updateOption,
  updateQuestion,
  type WizardState,
} from "../index";

function filled(): WizardState {
  return {
    title: "Quiz",
    passingScore: 70,
    questions: [
      {
        id: "q1",
        text: "One",
        type: QuestionType.MultipleChoice,
        options: [
          { id: "a", text: "A", isCorrect: true },
          { id: "b", text: "B", isCorrect: false },
          { id: "c", text: "C", isCorrect: false },
        ],
      },
      {
        id: "q2",
        text: "Two",
        type: QuestionType.TrueFalse,
        options: [
          { id: "t", text: "True", isCorrect: true },
          { id: "f", text: "False", isCorrect: false },
        ],
      },
    ],
  };
}

describe("initialWizard", () => {
  it("starts empty with a 70% passing score", () => {
    expect(initialWizard(null)).toEqual({
      title: "",
      passingScore: 70,
      questions: [],
    });
  });

  it("starts from a saved quiz, as a whole-number percentage", () => {
    const wizard = initialWizard({
      title: "Saved",
      passingScore: 0.655,
      questions: [
        {
          questionText: "Q",
          questionType: QuestionType.TrueFalse,
          options: [
            { optionText: "True", isCorrect: false },
            { optionText: "False", isCorrect: true },
          ],
        },
      ],
    });
    expect(wizard.title).toBe("Saved");
    expect(wizard.passingScore).toBe(66);
    expect(wizard.questions[0]).toMatchObject({
      text: "Q",
      type: QuestionType.TrueFalse,
      options: [
        { text: "True", isCorrect: false },
        { text: "False", isCorrect: true },
      ],
    });
    expect(wizard.questions[0].id).not.toBe(wizard.questions[0].options[0].id);
  });
});

describe("questions", () => {
  it("adds a blank multiple-choice question with the first option correct", () => {
    const [q] = addQuestion(initialWizard(null)).questions;
    expect(q).toMatchObject({
      text: "",
      type: QuestionType.MultipleChoice,
      options: [
        { text: "", isCorrect: true },
        { text: "", isCorrect: false },
      ],
    });
  });

  it("removes a question by id", () => {
    expect(removeQuestion(filled(), "q1").questions.map((q) => q.id)).toEqual([
      "q2",
    ]);
  });

  it("updates text and keeps the options", () => {
    const q = updateQuestion(filled(), "q1", { text: "New" }).questions[0];
    expect(q.text).toBe("New");
    expect(q.options.map((o) => o.id)).toEqual(["a", "b", "c"]);
  });

  it("switching to true/false resets the options to True and False", () => {
    const q = updateQuestion(filled(), "q1", { type: QuestionType.TrueFalse })
      .questions[0];
    expect(q.options.map((o) => [o.text, o.isCorrect])).toEqual([
      ["True", true],
      ["False", false],
    ]);
  });

  it("switching to multiple choice resets the options to two blanks", () => {
    const q = updateQuestion(filled(), "q2", {
      type: QuestionType.MultipleChoice,
    }).questions[1];
    expect(q.options.map((o) => [o.text, o.isCorrect])).toEqual([
      ["", true],
      ["", false],
    ]);
  });

  it("keeps the options when the type does not change", () => {
    const q = updateQuestion(filled(), "q2", { type: QuestionType.TrueFalse })
      .questions[1];
    expect(q.options.map((o) => o.id)).toEqual(["t", "f"]);
  });

  it("moves a question to a new position", () => {
    expect(moveQuestion(filled(), 0, 1).questions.map((q) => q.id)).toEqual([
      "q2",
      "q1",
    ]);
  });
});

describe("options", () => {
  it("adds a blank incorrect option", () => {
    const q = addOption(filled(), "q1").questions[0];
    expect(q.options).toHaveLength(4);
    expect(q.options[3]).toMatchObject({ text: "", isCorrect: false });
  });

  it("removes an option by id", () => {
    const q = removeOption(filled(), { questionId: "q1", optionId: "b" })
      .questions[0];
    expect(q.options.map((o) => o.id)).toEqual(["a", "c"]);
  });

  it("updates an option's text", () => {
    const q = updateOption(
      filled(),
      { questionId: "q1", optionId: "b" },
      { text: "Bee" }
    ).questions[0];
    expect(q.options[1].text).toBe("Bee");
    expect(q.options[0].text).toBe("A");
  });

  it("marks exactly one option correct", () => {
    const q = setCorrectOption(filled(), { questionId: "q1", optionId: "c" })
      .questions[0];
    expect(q.options.map((o) => o.isCorrect)).toEqual([false, false, true]);
  });

  it("leaves other questions alone", () => {
    const state = setCorrectOption(filled(), {
      questionId: "q1",
      optionId: "c",
    });
    expect(state.questions[1]).toEqual(filled().questions[1]);
  });
});

describe("getValidationErrors", () => {
  it("has no errors for a complete quiz", () => {
    expect(getValidationErrors(filled())).toEqual([]);
  });

  it("needs a title and a question", () => {
    expect(getValidationErrors(initialWizard(null))).toEqual([
      "Quiz title is required.",
      "At least one question is required.",
    ]);
  });

  it("reports each problem with a question by its number", () => {
    const state = filled();
    state.questions[1] = {
      id: "q2",
      text: " ",
      type: QuestionType.MultipleChoice,
      options: [{ id: "x", text: "", isCorrect: false }],
    };
    expect(getValidationErrors(state)).toEqual([
      "Question 2 has no text.",
      "Question 2 needs at least 2 options.",
      "Question 2 has no correct answer.",
      "Question 2 has an empty option.",
    ]);
  });
});

describe("canGoNext", () => {
  it("needs a title to leave settings", () => {
    expect(canGoNext(1, { ...filled(), title: " " })).toBe(false);
    expect(canGoNext(1, filled())).toBe(true);
  });

  it("needs a question to leave questions", () => {
    expect(canGoNext(2, { ...filled(), questions: [] })).toBe(false);
    expect(canGoNext(2, filled())).toBe(true);
  });

  it("always leaves answers, and never goes past review", () => {
    expect(canGoNext(3, initialWizard(null))).toBe(true);
    expect(canGoNext(4, filled())).toBe(false);
  });
});
