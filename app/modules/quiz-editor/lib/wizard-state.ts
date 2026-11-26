import { QuestionType } from "~/db/schema";

export type WizardOption = {
  id: string;
  text: string;
  isCorrect: boolean;
};

export type WizardQuestion = {
  id: string;
  text: string;
  type: QuestionType;
  options: WizardOption[];
};

export type WizardState = {
  title: string;
  passingScore: number;
  questions: WizardQuestion[];
};

/** Which option, in which question. */
export type OptionRef = { questionId: string; optionId: string };

/** The quiz as the loader returns it, which the wizard starts from. */
export type SavedQuiz = {
  title: string;
  passingScore: number;
  questions: {
    questionText: string;
    questionType: string;
    options: { optionText: string; isCorrect: boolean }[];
  }[];
};

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

export function initialWizard(existingQuiz: SavedQuiz | null): WizardState {
  if (existingQuiz) {
    return {
      title: existingQuiz.title,
      passingScore: Math.round(existingQuiz.passingScore * 100),
      questions: existingQuiz.questions.map((q) => ({
        id: generateId(),
        text: q.questionText,
        type: q.questionType as QuestionType,
        options: q.options.map((o) => ({
          id: generateId(),
          text: o.optionText,
          isCorrect: o.isCorrect,
        })),
      })),
    };
  }
  return {
    title: "",
    passingScore: 70,
    questions: [],
  };
}

export function addQuestion(prev: WizardState): WizardState {
  return {
    ...prev,
    questions: [
      ...prev.questions,
      {
        id: generateId(),
        text: "",
        type: QuestionType.MultipleChoice,
        options: [
          { id: generateId(), text: "", isCorrect: true },
          { id: generateId(), text: "", isCorrect: false },
        ],
      },
    ],
  };
}

export function removeQuestion(
  prev: WizardState,
  questionId: string
): WizardState {
  return {
    ...prev,
    questions: prev.questions.filter((q) => q.id !== questionId),
  };
}

export function updateQuestion(
  prev: WizardState,
  questionId: string,
  updates: Partial<WizardQuestion>
): WizardState {
  return {
    ...prev,
    questions: prev.questions.map((q) => {
      if (q.id !== questionId) return q;
      const updated = { ...q, ...updates };
      // When switching to TrueFalse, reset options to True/False
      if (
        updates.type === QuestionType.TrueFalse &&
        q.type !== QuestionType.TrueFalse
      ) {
        updated.options = [
          { id: generateId(), text: "True", isCorrect: true },
          { id: generateId(), text: "False", isCorrect: false },
        ];
      }
      // When switching to MultipleChoice from TrueFalse, add blank options
      if (
        updates.type === QuestionType.MultipleChoice &&
        q.type !== QuestionType.MultipleChoice
      ) {
        updated.options = [
          { id: generateId(), text: "", isCorrect: true },
          { id: generateId(), text: "", isCorrect: false },
        ];
      }
      return updated;
    }),
  };
}

export function moveQuestion(
  prev: WizardState,
  fromIndex: number,
  toIndex: number
): WizardState {
  const reordered = [...prev.questions];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);
  return { ...prev, questions: reordered };
}

export function addOption(prev: WizardState, questionId: string): WizardState {
  return {
    ...prev,
    questions: prev.questions.map((q) =>
      q.id === questionId
        ? {
            ...q,
            options: [
              ...q.options,
              { id: generateId(), text: "", isCorrect: false },
            ],
          }
        : q
    ),
  };
}

export function removeOption(
  prev: WizardState,
  { questionId, optionId }: OptionRef
): WizardState {
  return {
    ...prev,
    questions: prev.questions.map((q) =>
      q.id === questionId
        ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
        : q
    ),
  };
}

export function updateOption(
  prev: WizardState,
  { questionId, optionId }: OptionRef,
  updates: Partial<WizardOption>
): WizardState {
  return {
    ...prev,
    questions: prev.questions.map((q) => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        options: q.options.map((o) => {
          if (o.id !== optionId) return o;
          return { ...o, ...updates };
        }),
      };
    }),
  };
}

export function setCorrectOption(
  prev: WizardState,
  { questionId, optionId }: OptionRef
): WizardState {
  return {
    ...prev,
    questions: prev.questions.map((q) => {
      if (q.id !== questionId) return q;
      return {
        ...q,
        options: q.options.map((o) => ({
          ...o,
          isCorrect: o.id === optionId,
        })),
      };
    }),
  };
}

export function getValidationErrors(wizard: WizardState): string[] {
  const validationErrors: string[] = [];
  if (!wizard.title.trim()) validationErrors.push("Quiz title is required.");
  if (wizard.questions.length === 0)
    validationErrors.push("At least one question is required.");
  for (const q of wizard.questions) {
    if (!q.text.trim())
      validationErrors.push(
        `Question ${wizard.questions.indexOf(q) + 1} has no text.`
      );
    if (q.options.length < 2)
      validationErrors.push(
        `Question ${wizard.questions.indexOf(q) + 1} needs at least 2 options.`
      );
    if (!q.options.some((o) => o.isCorrect))
      validationErrors.push(
        `Question ${wizard.questions.indexOf(q) + 1} has no correct answer.`
      );
    for (const opt of q.options) {
      if (!opt.text.trim())
        validationErrors.push(
          `Question ${wizard.questions.indexOf(q) + 1} has an empty option.`
        );
    }
  }
  return validationErrors;
}

export function canGoNext(step: number, wizard: WizardState) {
  if (step === 1) return wizard.title.trim().length > 0;
  if (step === 2) return wizard.questions.length > 0;
  if (step === 3) return true;
  return false;
}
