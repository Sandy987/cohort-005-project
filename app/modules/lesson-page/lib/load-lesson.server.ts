import { data } from "react-router";
import { db } from "~/db";
import type {
  CourseDecisions,
  DenialReason,
} from "~/modules/permissions/course-permissions.server";
import { isBookmarked } from "~/lib/bookmarks.server";
import { getNote } from "~/lib/notes.server";
import { renderMarkdown } from "~/lib/markdown.server";
import {
  flattenCourseLessons,
  getCourseWithDetails,
  getLessonById,
  getModuleById,
  getUserById,
} from "./course-content.server";
import {
  calculateWatchProgress,
  getLastWatchPosition,
  getLessonProgress,
  getLessonProgressForCourse,
  markLessonInProgress,
} from "./progress.server";
import { getLessonThread, renderThread } from "./thread.server";
import {
  getBestAttempt,
  getQuizByLessonId,
  getQuizWithQuestions,
} from "./quiz.server";

type FoundDecisions = Extract<CourseDecisions, { found: true }>;
type Lesson = NonNullable<ReturnType<typeof getLessonById>>;
type CourseWithDetails = NonNullable<ReturnType<typeof getCourseWithDetails>>;

/**
 * Everything the Lesson page shows, for someone the course was found for.
 * Someone who cannot view the content gets the locked view.
 */
export async function loadLessonPage(
  decisions: FoundDecisions,
  lessonId: number
) {
  const courseWithDetails = getCourseWithDetails(decisions.course.id);
  const lesson = getLessonById(lessonId);
  const mod = lesson ? getModuleById(lesson.moduleId) : undefined;
  if (!courseWithDetails || !lesson || !mod) {
    throw data("Lesson not found", { status: 404 });
  }

  const outline = {
    course: {
      id: courseWithDetails.id,
      title: courseWithDetails.title,
      slug: courseWithDetails.slug,
    },
    curriculum: courseWithDetails.modules.map((m) => ({
      id: m.id,
      title: m.title,
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title })),
    })),
    module: { id: mod.id, title: mod.title },
  };

  // Someone who can't view the content gets the lesson's title, its module and
  // the course outline — never the body, video or quiz — plus the reason, so
  // the page can show the right call to action.
  if (!decisions.view.allowed) {
    const lockedReason: DenialReason = decisions.view.reason;
    return {
      view: "locked" as const,
      ...outline,
      lesson: { id: lesson.id, title: lesson.title },
      enrolled: decisions.enrolled,
      lockedReason,
    };
  }

  return {
    view: "full" as const,
    ...outline,
    ...(await loadFullLesson(decisions, lesson, courseWithDetails)),
  };
}

async function loadFullLesson(
  decisions: FoundDecisions,
  lesson: Lesson,
  courseWithDetails: CourseWithDetails
) {
  const { course, person, enrolled, take, manage } = decisions;
  const currentUserId = person?.id ?? null;
  const lessonId = lesson.id;

  // Progress is recorded only for people who can take the course, so a
  // Student under a Country Lock gets none.
  const progress =
    currentUserId && take.allowed
      ? loadProgress(currentUserId, lesson, course.id)
      : NO_PROGRESS;

  // Everything from here on is behind the can-view-content bar:
  // comments, Bookmarks and Notes are confidential to the course.
  const instructor = getUserById(course.instructorId);
  const comments = await renderThread(getLessonThread(lessonId));
  const bookmarked = currentUserId
    ? isBookmarked(db, currentUserId, lessonId)
    : false;
  const note = currentUserId ? getNote(db, currentUserId, lessonId) : undefined;

  const contentHtml = lesson.content
    ? await renderMarkdown(lesson.content)
    : null;

  return {
    lesson,
    contentHtml,
    ...progress,
    enrolled,
    currentUserId,
    ...neighbours(courseWithDetails, lessonId),
    ...loadQuiz(lessonId, currentUserId),
    comments,
    canModerate: manage.allowed,
    instructorName: instructor?.name ?? "your instructor",
    bookmarked,
    note: note ? { body: note.body, updatedAt: note.updatedAt } : null,
  };
}

type LessonProgressView = {
  lessonStatus: string | null;
  lastWatchPosition: number;
  watchProgress: number;
  lessonProgressMap: Record<number, string>;
};

const NO_PROGRESS: LessonProgressView = {
  lessonStatus: null,
  lastWatchPosition: 0,
  watchProgress: 0,
  lessonProgressMap: {},
};

/** Marks the lesson in progress, since viewing it counts, then reads progress back. */
function loadProgress(
  userId: number,
  lesson: Lesson,
  courseId: number
): LessonProgressView {
  markLessonInProgress(userId, lesson.id);
  const lessonStatus = getLessonProgress(userId, lesson.id)?.status ?? null;

  // Progress for every lesson in the course, for the curriculum sidebar
  const lessonProgressMap: Record<number, string> = {};
  for (const record of getLessonProgressForCourse(userId, courseId)) {
    lessonProgressMap[record.lessonId] = record.status;
  }

  if (!lesson.videoUrl) {
    return { ...NO_PROGRESS, lessonStatus, lessonProgressMap };
  }

  // Video watch state for resume and progress display
  const videoDurationSeconds = (lesson.durationMinutes ?? 0) * 60;
  return {
    lessonStatus,
    lessonProgressMap,
    lastWatchPosition: getLastWatchPosition(userId, lesson.id),
    watchProgress:
      videoDurationSeconds > 0
        ? calculateWatchProgress(userId, lesson.id, videoDurationSeconds)
        : 0,
  };
}

function neighbours(courseWithDetails: CourseWithDetails, lessonId: number) {
  const allLessons = flattenCourseLessons(courseWithDetails);
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  return {
    prevLesson: currentIndex > 0 ? allLessons[currentIndex - 1] : null,
    nextLesson:
      currentIndex < allLessons.length - 1
        ? allLessons[currentIndex + 1]
        : null,
  };
}

type LessonQuiz = {
  id: number;
  title: string;
  passingScore: number;
  questions: Array<{
    id: number;
    questionText: string;
    questionType: string;
    position: number;
    options: Array<{ id: number; optionText: string }>;
  }>;
};

function loadQuiz(
  lessonId: number,
  currentUserId: number | null
): {
  quiz: LessonQuiz | null;
  bestAttempt: { score: number; passed: boolean } | null;
} {
  const quizRecord = getQuizByLessonId(lessonId);
  if (!quizRecord) return { quiz: null, bestAttempt: null };

  const best = currentUserId
    ? getBestAttempt(currentUserId, quizRecord.id)
    : undefined;
  return {
    quiz: withoutAnswers(getQuizWithQuestions(quizRecord.id)),
    bestAttempt: best ? { score: best.score, passed: best.passed } : null,
  };
}

/** Strip isCorrect from options so answers aren't leaked to the client. */
function withoutAnswers(
  quizData: ReturnType<typeof getQuizWithQuestions>
): LessonQuiz | null {
  if (!quizData) return null;
  return {
    id: quizData.id,
    title: quizData.title,
    passingScore: quizData.passingScore,
    questions: quizData.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionType: q.questionType,
      position: q.position,
      options: q.options.map((o) => ({ id: o.id, optionText: o.optionText })),
    })),
  };
}

export type LessonPageData = Awaited<ReturnType<typeof loadLessonPage>>;
export type FullLessonData = Extract<LessonPageData, { view: "full" }>;
export type LockedLessonData = Extract<LessonPageData, { view: "locked" }>;
