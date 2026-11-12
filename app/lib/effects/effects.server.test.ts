import { afterEach, describe, expect, it, vi } from "vitest";
import type { Email, MailTransport } from "~/lib/notifications/mailer.server";
import {
  createEffectQueue,
  flushEffects,
  type NotificationEffect,
} from "~/lib/effects/effects.server";

function recordingMail(failFor: string[] = []) {
  const sent: Email[] = [];
  const transport: MailTransport = {
    async send(email) {
      if (failFor.includes(email.to)) throw new Error(`boom: ${email.to}`);
      sent.push(email);
    },
  };
  return { sent, transport };
}

function recordingNotifications() {
  const triggered: NotificationEffect[] = [];
  return {
    triggered,
    async trigger(notification: NotificationEffect) {
      triggered.push(notification);
    },
  };
}

const email = (to: string): Email => ({ to, subject: "Hi", body: "Hello" });

const replied: NotificationEffect = {
  workflow: "refund-request-decided",
  recipientIds: [1],
  actorId: 2,
  data: {
    outcome: "approved",
    note: null,
    courseTitle: "Test Course",
    url: "/x",
  },
};

describe("NotificationEffect payloads", () => {
  it("are typed per workflow", () => {
    const wrongPayload: NotificationEffect = {
      workflow: "comment-reply",
      recipientIds: [1],
      actorId: 2,
      // @ts-expect-error comment-reply carries replier and lesson, not an outcome
      data: { outcome: "approved", courseTitle: "T", url: "/x" },
    };
    expect(wrongPayload.workflow).toBe("comment-reply");
  });
});

describe("flushing effects", () => {
  afterEach(() => vi.restoreAllMocks());

  it("runs every queued effect", async () => {
    const queue = createEffectQueue();
    queue.email(email("a@example.com"));
    queue.notification(replied);
    queue.email(email("b@example.com"));
    const mail = recordingMail();
    const notifications = recordingNotifications();

    await flushEffects(queue.effects, {
      mail: mail.transport,
      notification: notifications.trigger,
    });

    expect(mail.sent.map((e) => e.to)).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
    expect(notifications.triggered).toEqual([replied]);
  });

  it("keeps going when an effect throws, and logs the failure", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const queue = createEffectQueue();
    queue.email(email("broken@example.com"));
    queue.email(email("fine@example.com"));
    queue.notification(replied);
    const mail = recordingMail(["broken@example.com"]);
    const notifications = recordingNotifications();

    await expect(
      flushEffects(queue.effects, {
        mail: mail.transport,
        notification: notifications.trigger,
      })
    ).resolves.toBeUndefined();

    expect(mail.sent.map((e) => e.to)).toEqual(["fine@example.com"]);
    expect(notifications.triggered).toEqual([replied]);
    expect(log).toHaveBeenCalledTimes(1);
    expect(String(log.mock.calls[0])).toContain("boom: broken@example.com");
  });

  it("swallows a failing notification too", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const queue = createEffectQueue();
    queue.notification(replied);
    queue.email(email("a@example.com"));
    const mail = recordingMail();

    await flushEffects(queue.effects, {
      mail: mail.transport,
      notification: async () => {
        throw new Error("knock down");
      },
    });

    expect(mail.sent).toHaveLength(1);
    expect(log).toHaveBeenCalledTimes(1);
  });
});
