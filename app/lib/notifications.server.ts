import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Knock } from "@knocklabs/node";
import { inArray } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";
import { users } from "~/db/schema";
import type { NotificationEffect } from "~/lib/effects.server";

// ─── Notifications ───
// In-app Notifications, delivered through Knock when KNOCK_SECRET_API_KEY is
// set. Without a key (local dev, tests) each trigger is written to
// .outbox/notifications/ as a JSON file instead, like the mailer's outbox.

// Each key has a Knock CLI workflow in knock/workflows/<key>/. Keep them in sync.
export const Workflows = {
  RefundRequestDecided: "refund-request-decided",
} as const;

export type WorkflowKey = (typeof Workflows)[keyof typeof Workflows];

/** A Cadence user, identified inline. Their Cadence id is their Knock id. */
export type Recipient = { id: string; name: string; email: string };

export type Trigger = {
  recipients: Recipient[];
  actor: Recipient | null;
  data: Record<string, unknown>;
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
      mkdirSync(directory, { recursive: true });
      const file = join(directory, `${Date.now()}-${workflow}.json`);
      writeFileSync(file, JSON.stringify({ workflow, ...trigger }, null, 2));
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

type Db = BetterSQLite3Database<typeof schema>;

/**
 * Delivers one Notification. Nobody is notified about their own action, so
 * the actor is dropped from the recipients; if nobody is left, nothing is
 * triggered.
 */
export async function notify(
  db: Db,
  notification: NotificationEffect,
  transport: NotificationTransport
): Promise<void> {
  const { workflow, recipientIds, actorId, data } = notification;

  const people = db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(inArray(users.id, [...recipientIds, actorId]))
    .all();
  const byId = new Map(
    people.map((person) => [
      person.id,
      { id: String(person.id), name: person.name, email: person.email },
    ])
  );

  const recipients = [...new Set(recipientIds)]
    .filter((id) => id !== actorId)
    .flatMap((id) => byId.get(id) ?? []);
  if (recipients.length === 0) return;

  await transport.trigger(workflow, {
    recipients,
    actor: byId.get(actorId) ?? null,
    data,
  });
}
