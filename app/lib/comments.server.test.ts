import { eq } from "drizzle-orm";
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { createComment } from "./comments.server";
import { recordingSink } from "./effects.server";
import { notify, recordingTransport } from "./notifications.server";

type TestDb = ReturnType<typeof createTestDb>;

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let effects: ReturnType<typeof recordingSink>;
let lessonId: number;
let otherLessonId: number;

beforeEach(() => {
  db = createTestDb();
  effects = recordingSink();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  [lessonId, otherLessonId] = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

describe("createComment", () => {
  it("creates a top-level comment with a trimmed body", () => {
    const comment = createComment(
      db,
      base.user.id,
      lessonId,
      null,
      "  How do generics work?  ",
      effects
    );

    expect(comment).toMatchObject({
      userId: base.user.id,
      lessonId,
      parentId: null,
      body: "How do generics work?",
    });
  });

  it("creates a reply to a top-level comment", () => {
    const question = postQuestion(lessonId);

    const reply = createComment(
      db,
      base.instructor.id,
      lessonId,
      question.id,
      "Like function parameters, but for types.",
      effects
    );

    expect(reply).toMatchObject({
      userId: base.instructor.id,
      lessonId,
      parentId: question.id,
      body: "Like function parameters, but for types.",
    });
  });

  it("rejects a reply to a reply", () => {
    const question = postQuestion(lessonId);
    const reply = createComment(
      db,
      base.instructor.id,
      lessonId,
      question.id,
      "An answer",
      effects
    );

    expect(() =>
      createComment(db, base.user.id, lessonId, reply.id, "Thanks!", effects)
    ).toThrow("Replies can only be one level deep");
  });

  it("rejects a parent from a different lesson", () => {
    const question = postQuestion(otherLessonId);

    expect(() =>
      createComment(
        db,
        base.instructor.id,
        lessonId,
        question.id,
        "An answer",
        effects
      )
    ).toThrow("Parent comment belongs to a different lesson");
  });

  it("rejects a blank body", () => {
    expect(() =>
      createComment(db, base.user.id, lessonId, null, "   ", effects)
    ).toThrow("Comment cannot be empty");
  });

  it("rejects a body over 5000 characters", () => {
    expect(() =>
      createComment(db, base.user.id, lessonId, null, "a".repeat(5001), effects)
    ).toThrow("Comment must be 5000 characters or fewer");
  });

  describe("effects", () => {
    it("notifies the top-level author of a reply, with the replier as actor", () => {
      const question = postQuestion(lessonId);
      createComment(db, base.instructor.id, lessonId, question.id, "Hi", effects);

      expect(effects.emails).toEqual([]);
      expect(effects.notifications).toEqual([
        {
          workflow: "comment-reply",
          recipientIds: [base.user.id],
          actorId: base.instructor.id,
          data: {
            replierName: "Test Instructor",
            courseTitle: "Test Course",
            lessonTitle: "Lesson 1",
            url: `/courses/test-course/lessons/${lessonId}`,
          },
        },
      ]);
    });

    it("pushes nothing for a top-level comment", () => {
      postQuestion(lessonId, effects);

      expect(effects.emails).toEqual([]);
      expect(effects.notifications).toEqual([]);
    });

    it("pushes nothing for a reply to a soft-deleted top-level comment", () => {
      const question = postQuestion(lessonId);
      db.update(schema.comments)
        .set({ deletedAt: new Date().toISOString() })
        .where(eq(schema.comments.id, question.id))
        .run();

      createComment(db, base.instructor.id, lessonId, question.id, "Hi", effects);

      expect(effects.notifications).toEqual([]);
    });

    it("triggers nothing when the author replies to their own comment", async () => {
      const question = postQuestion(lessonId);
      createComment(db, base.user.id, lessonId, question.id, "Update", effects);

      const transport = recordingTransport();
      for (const notification of effects.notifications) {
        await notify(db, notification, transport);
      }

      expect(transport.triggers).toEqual([]);
    });

    it("pushes nothing for a rejected reply", () => {
      const question = postQuestion(lessonId);

      expect(() =>
        createComment(db, base.instructor.id, lessonId, question.id, " ", effects)
      ).toThrow();
      expect(effects.notifications).toEqual([]);
    });
  });
});

function postQuestion(onLessonId: number, sink = recordingSink()) {
  return createComment(
    db,
    base.user.id,
    onLessonId,
    null,
    "How do generics work?",
    sink
  );
}
