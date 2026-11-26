import type { WizardData } from "./wizard-schema";
import {
  createOption,
  createQuestion,
  createQuiz,
  deleteQuiz,
  getLessonById,
  getModuleById,
  getQuizByLessonId,
  getQuizWithQuestions,
  type Db,
} from "./quiz-store";

export function getEditorData(db: Db, lessonId: number) {
  const lesson = getLessonById(db, lessonId);
  const mod = lesson && getModuleById(db, lesson.moduleId);
  if (!lesson || !mod) return null;

  // Load existing quiz if present
  const existingQuizBasic = getQuizByLessonId(db, lesson.id);
  const existingQuiz = existingQuizBasic
    ? getQuizWithQuestions(db, existingQuizBasic.id)
    : null;

  return { lesson, module: mod, existingQuiz };
}

export function saveQuiz(db: Db, lessonId: number, wizardData: WizardData) {
  // Delete existing quiz if present
  deleteQuizForLesson(db, lessonId);

  // Create the quiz
  const quiz = createQuiz(db, {
    lessonId,
    title: wizardData.title.trim(),
    passingScore: wizardData.passingScore / 100,
  });

  // Create questions and options
  for (let qi = 0; qi < wizardData.questions.length; qi++) {
    const q = wizardData.questions[qi];
    const question = createQuestion(db, {
      quizId: quiz.id,
      questionText: q.text.trim(),
      questionType: q.type,
      position: qi + 1,
    });

    for (const opt of q.options) {
      createOption(db, {
        questionId: question.id,
        optionText: opt.text.trim(),
        isCorrect: opt.isCorrect,
      });
    }
  }
}

export function deleteQuizForLesson(db: Db, lessonId: number) {
  const existingQuiz = getQuizByLessonId(db, lessonId);
  if (existingQuiz) {
    deleteQuiz(db, existingQuiz.id);
  }
}
