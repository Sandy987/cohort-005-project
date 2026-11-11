import { eq } from "drizzle-orm";
import type { Db } from "~/db";
import { comments, courses, lessons, modules, users } from "~/db/schema";
import type { EffectSink } from "~/lib/effects.server";
import { Workflows } from "~/lib/notifications.server";
import { MAX_COMMENT_LENGTH, MIN_COMMENT_LENGTH } from "~/lib/comments";

function assertValidBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length < MIN_COMMENT_LENGTH) {
    throw new Error("Comment cannot be empty");
  }
  if (trimmed.length > MAX_COMMENT_LENGTH) {
    throw new Error(
      `Comment must be ${MAX_COMMENT_LENGTH} characters or fewer`
    );
  }
  return trimmed;
}

/**
 * Posts a comment on a lesson: a top-level question when `parentId` is null,
 * otherwise a reply to a top-level comment on the same lesson. Replies are
 * one level deep. Throws on an invalid body, unknown lesson, or bad parent.
 *
 * A reply notifies the top-level comment's author (`comment-reply`), unless
 * that comment is soft-deleted. Nobody else is notified.
 */
export function createComment(
  db: Db,
  userId: number,
  lessonId: number,
  parentId: number | null,
  body: string,
  effects: EffectSink
) {
  const trimmed = assertValidBody(body);

  const lesson = db
    .select({
      courseTitle: courses.title,
      courseSlug: courses.slug,
      lessonTitle: lessons.title,
    })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .innerJoin(courses, eq(modules.courseId, courses.id))
    .where(eq(lessons.id, lessonId))
    .get();
  if (!lesson) {
    throw new Error("Lesson not found");
  }

  let topLevelAuthorId: number | null = null;
  if (parentId !== null) {
    const parent = db
      .select()
      .from(comments)
      .where(eq(comments.id, parentId))
      .get();
    if (!parent) {
      throw new Error("Parent comment not found");
    }
    if (parent.lessonId !== lessonId) {
      throw new Error("Parent comment belongs to a different lesson");
    }
    if (parent.parentId !== null) {
      throw new Error("Replies can only be one level deep");
    }
    if (parent.deletedAt === null) {
      topLevelAuthorId = parent.userId;
    }
  }

  const comment = db
    .insert(comments)
    .values({ userId, lessonId, parentId, body: trimmed })
    .returning()
    .get();

  if (topLevelAuthorId !== null) {
    const replier = db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    // A self-reply is pushed too; notify() drops the actor, so nobody is told.
    effects.notification({
      workflow: Workflows.CommentReply,
      recipientIds: [topLevelAuthorId],
      actorId: userId,
      data: {
        replierName: replier?.name ?? "Someone",
        courseTitle: lesson.courseTitle,
        lessonTitle: lesson.lessonTitle,
        url: `/courses/${lesson.courseSlug}/lessons/${lessonId}`,
      },
    });
  }

  return comment;
}
