import { join } from "node:path";
import { Knock } from "@knocklabs/node";
import { inArray } from "drizzle-orm";
import type { Db } from "~/db";
import { users } from "~/db/schema";
import type { NotificationEffect } from "~/lib/effects.server";
import { writeOutboxFile } from "~/lib/outbox.server";

// ─── Notifications ───
// In-app Notifications, delivered through Knock when KNOCK_SECRET_API_KEY is
// set. Without a key (local dev, tests) each trigger is written to
// .outbox/notifications/ as a JSON file instead, like the mailer's outbox.

// Each key has a Knock CLI workflow in knock/workflows/<key>/. Keep them in sync.
export const Workflows = {
  RefundRequestDecided: "refund-request-decided",
  RefundRequestOpened: "refund-request-opened",
  CommentReply: "comment-reply",
} as const;

export type WorkflowKey = (typeof Workflows)[keyof typeof Workflows];

/** The `data` each workflow's template reads. Every `url` is the link target. */
export type WorkflowData = {
  [Workflows.RefundRequestDecided]: {
    outcome: "approved" | "declined";
    note: string | null;
    courseTitle: string;
    url: string;
  };
  [Workflows.RefundRequestOpened]: {
    courseTitle: string;
    buyerName: string;
    reason: string;
    url: string;
  };
  [Workflows.CommentReply]: {
    replierName: string;
    courseTitle: string;
    lessonTitle: string;
    url: string;
  };
};

/** A Cadence user, identified inline. Their Cadence id is their Knock id. */
export type Recipient = { id: string; name: string; email: string };

export type Trigger = {
  recipients: Recipient[];
  actor: Recipient | null;
  data: WorkflowData[WorkflowKey];
};

export interface NotificationTransport {
  trigger(workflow: WorkflowKey, trigger: Trigger): Promise<void>;
}

export function knockTransport(secretKey: string): NotificationTransport {
  const knock = new Knock({ apiKey: secretKey });
  return {
    async trigger(workflow, { recipients, actor, data }) {
      await knock.workflows.trigger(workflow, { recipients, actor, data });
    },
  };
}

export function outboxTransport(directory: string): NotificationTransport {
  return {
    async trigger(workflow, trigger) {
      writeOutboxFile(directory, workflow, { workflow, ...trigger });
    },
  };
}

/** A transport for tests: read back what was triggered. */
export function recordingTransport() {
  const triggers: ({ workflow: WorkflowKey } & Trigger)[] = [];
  return {
    triggers,
    async trigger(workflow: WorkflowKey, trigger: Trigger) {
      triggers.push({ workflow, ...trigger });
    },
  } satisfies NotificationTransport & { triggers: unknown };
}

export function defaultNotificationTransport(): NotificationTransport {
  const secretKey = process.env.KNOCK_SECRET_API_KEY;
  return secretKey
    ? knockTransport(secretKey)
    : outboxTransport(join(".outbox", "notifications"));
}

/**
 * Delivers one Notification. Nobody is notified about their own action, so
 * the actor is dropped from the recipients, as is anyone Muted; if nobody is
 * left, nothing is triggered.
 */
export async function notify(
  db: Db,
  notification: NotificationEffect,
  transport: NotificationTransport
): Promise<void> {
  const { workflow, recipientIds, actorId, data } = notification;

  const people = db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      muted: users.muted,
    })
    .from(users)
    .where(inArray(users.id, [...recipientIds, actorId]))
    .all();
  const byId = new Map(
    people.map((person) => [
      person.id,
      { id: String(person.id), name: person.name, email: person.email },
    ])
  );

  const muted = new Set(people.filter((p) => p.muted).map((p) => p.id));

  const recipients = [...new Set(recipientIds)]
    .filter((id) => id !== actorId && !muted.has(id))
    .flatMap((id) => byId.get(id) ?? []);
  if (recipients.length === 0) return;

  await transport.trigger(workflow, {
    recipients,
    actor: byId.get(actorId) ?? null,
    data,
  });
}
