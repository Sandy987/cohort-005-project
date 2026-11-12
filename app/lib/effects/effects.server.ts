import type { Email, MailTransport } from "~/lib/notifications/mailer.server";
import type { WorkflowData, WorkflowKey } from "~/lib/notifications/notifications.server";

// ─── Side effects (docs/adr/0014) ───
// Domain functions report every side effect that should follow a committed
// change to an EffectSink, which they take as a required parameter. They push
// only after their transaction commits. The web layer flushes the queue after
// the request (see effects-context.server.ts). No React Router here.

/** One Notification to deliver; `data` is typed by its workflow. */
export type NotificationEffect = {
  [K in WorkflowKey]: {
    workflow: K;
    recipientIds: number[];
    actorId: number;
    data: WorkflowData[K];
  };
}[WorkflowKey];

export type Effect =
  | { kind: "email"; email: Email }
  | { kind: "notification"; notification: NotificationEffect };

export interface EffectSink {
  email(email: Email): void;
  notification(notification: NotificationEffect): void;
}

export type EffectQueue = EffectSink & { readonly effects: readonly Effect[] };

/** A sink that keeps every effect in order, ready to flush. */
export function createEffectQueue(): EffectQueue {
  const effects: Effect[] = [];
  return {
    effects,
    email(email) {
      effects.push({ kind: "email", email });
    },
    notification(notification) {
      effects.push({ kind: "notification", notification });
    },
  };
}

/** A sink for tests: read back what a domain function pushed. */
export function recordingSink() {
  const queue = createEffectQueue();
  return {
    ...queue,
    get emails(): Email[] {
      return queue.effects.flatMap((e) =>
        e.kind === "email" ? [e.email] : []
      );
    },
    get notifications(): NotificationEffect[] {
      return queue.effects.flatMap((e) =>
        e.kind === "notification" ? [e.notification] : []
      );
    },
  };
}

export type EffectTransports = {
  mail: MailTransport;
  notification: (notification: NotificationEffect) => Promise<void>;
};

export async function flushEffects(
  effects: readonly Effect[],
  transports: EffectTransports
): Promise<void> {
  await Promise.all(
    effects.map(async (effect) => {
      try {
        switch (effect.kind) {
          case "email":
            await transports.mail.send(effect.email);
            break;
          case "notification":
            await transports.notification(effect.notification);
            break;
          default:
            effect satisfies never;
        }
      } catch (error) {
        console.error(`Failed to deliver ${effect.kind} effect`, error);
      }
    })
  );
}
