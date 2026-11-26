import { data } from "react-router";
import { z } from "zod";
import { db } from "~/db";
import { quizzes } from "~/db/schema";
import { eq } from "drizzle-orm";
import {
  coursePermissions,
  type CourseRef,
} from "~/modules/permissions/course-permissions.server";
import {
  createComment,
  deleteComment,
  editComment,
} from "~/lib/comments.server";
import { defaultNotifications } from "~/lib/notifications.server";
import { toggleBookmark } from "~/lib/bookmarks.server";
import { saveNote } from "~/lib/notes.server";
import { MAX_NOTE_LENGTH } from "~/lib/notes";
import type { Person } from "~/modules/permissions/person.server";
import { parseFormData } from "~/lib/validation";
import { getCommentById } from "./thread.server";
import { computeResult } from "./quiz.server";
import { markLessonComplete } from "./progress.server";

const createCommentSchema = z.object({
  intent: z.literal("create-comment"),
  body: z.string(),
  parentId: z.coerce.number().int().optional(),
});

const editCommentSchema = z.object({
  intent: z.literal("edit-comment"),
  commentId: z.coerce.number().int(),
  body: z.string(),
});

const saveNoteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write something before saving your note.")
    .max(
      MAX_NOTE_LENGTH,
      `Your note is over ${MAX_NOTE_LENGTH.toLocaleString("en")} characters, so it was not saved.`
    ),
});

const deleteCommentSchema = z.object({
  intent: z.literal("delete-comment"),
  commentId: z.coerce.number().int(),
});

type LessonActionContext = {
  formData: FormData;
  person: Person;
  ref: CourseRef;
  lessonId: number;
};

/**
 * Runs one Lesson page intent for someone whose capability for it the route
 * has already checked.
 */
export async function runLessonAction({
  intent,
  ...context
}: LessonActionContext & { intent: string }) {
  switch (intent) {
    case "create-comment":
    case "edit-comment":
    case "delete-comment":
      return runCommentIntent(intent, context);
    case "toggle-bookmark":
      return {
        ok: true,
        bookmarked: toggleBookmark(
          db,
          context.person.id,
          context.lessonId,
          new Date()
        ),
      };
    case "save-note":
      return saveNoteIntent(context);
    case "mark-complete":
      markLessonComplete(context.person.id, context.lessonId);
      return { success: true };
    case "submit-quiz":
      return submitQuizIntent(context);
  }
  throw data("Invalid action", { status: 400 });
}

type CommentResult = { ok: true } | { ok: false; error: string };

async function runCommentIntent(
  intent: "create-comment" | "edit-comment" | "delete-comment",
  context: LessonActionContext
): Promise<CommentResult> {
  try {
    if (intent === "create-comment") return await createCommentIntent(context);
    if (intent === "edit-comment") return editCommentIntent(context);
    return await deleteCommentIntent(context);
  } catch (error) {
    // Service validation failures are user-correctable; anything thrown as a
    // Response (404 below) should keep bubbling.
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

async function createCommentIntent({
  formData,
  person,
  lessonId,
}: LessonActionContext): Promise<CommentResult> {
  const parsed = parseFormData(formData, createCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Enter a comment before posting." };
  }
  const created = await createComment(
    db,
    person.id,
    lessonId,
    parsed.data.parentId ?? null,
    parsed.data.body,
    new Date(),
    await defaultNotifications()
  );
  if (!created.ok) return created;
  return { ok: true };
}

/**
 * Scope the id to this lesson so a comment elsewhere can't be reached by
 * posting its id to this route.
 */
function requireLessonComment(commentId: number, lessonId: number) {
  const existing = getCommentById(commentId);
  if (!existing || existing.lessonId !== lessonId) {
    throw data("Comment not found", { status: 404 });
  }
}

function editCommentIntent({
  formData,
  person,
  lessonId,
}: LessonActionContext): CommentResult {
  const parsed = parseFormData(formData, editCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Enter a comment before saving." };
  }
  requireLessonComment(parsed.data.commentId, lessonId);
  const edited = editComment(
    db,
    parsed.data.commentId,
    person.id,
    parsed.data.body,
    new Date()
  );
  if (!edited.ok) return edited;
  return { ok: true };
}

async function deleteCommentIntent({
  formData,
  person,
  ref,
  lessonId,
}: LessonActionContext): Promise<CommentResult> {
  const parsed = parseFormData(formData, deleteCommentSchema);
  if (!parsed.success) {
    return { ok: false, error: "Could not delete that comment." };
  }
  requireLessonComment(parsed.data.commentId, lessonId);
  // Anyone who can view may delete their own posts; moderating someone
  // else's takes the manage capability.
  const decisions = coursePermissions.decide(person, ref);
  const canModerate = decisions.found && decisions.manage.allowed;
  const deleted = await deleteComment(
    db,
    parsed.data.commentId,
    person.id,
    canModerate,
    new Date(),
    await defaultNotifications()
  );
  if (!deleted.ok) return deleted;
  return { ok: true };
}

function saveNoteIntent({ formData, person, lessonId }: LessonActionContext) {
  const parsed = parseFormData(formData, saveNoteSchema);
  if (!parsed.success) {
    return { ok: false, error: parsed.errors.body };
  }
  const saved = saveNote(db, person.id, lessonId, parsed.data.body, new Date());
  if (!saved.ok) return saved;
  return { ok: true };
}

function submitQuizIntent({ formData, person, lessonId }: LessonActionContext) {
  const quizId = Number(formData.get("quizId"));
  if (isNaN(quizId)) {
    throw data("Invalid quiz ID", { status: 400 });
  }
  // Scope the quiz to this lesson so a quiz elsewhere can't be reached by
  // posting its id to this route.
  const quiz = db.select().from(quizzes).where(eq(quizzes.id, quizId)).get();
  if (!quiz || quiz.lessonId !== lessonId) {
    throw data("Quiz not found", { status: 404 });
  }

  const result = computeResult(
    person.id,
    quizId,
    selectedAnswersFrom(formData)
  );
  if (!result) {
    throw data("Failed to score quiz", { status: 500 });
  }

  return { quizResult: result };
}

/** Form fields named "question-{questionId}", each with an optionId value. */
function selectedAnswersFrom(formData: FormData): Record<number, number> {
  const selectedAnswers: Record<number, number> = {};
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith("question-")) continue;
    const questionId = Number(key.replace("question-", ""));
    const optionId = Number(value);
    if (!isNaN(questionId) && !isNaN(optionId)) {
      selectedAnswers[questionId] = optionId;
    }
  }
  return selectedAnswers;
}
