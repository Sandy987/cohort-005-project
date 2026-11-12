import { createContext, type MiddlewareFunction } from "react-router";
import { db } from "~/db";
import { defaultMailTransport } from "~/lib/notifications/mailer.server";
import {
  defaultNotificationTransport,
  notify,
} from "~/lib/notifications/notifications.server";
import {
  createEffectQueue,
  flushEffects,
  type Effect,
  type EffectSink,
} from "~/lib/effects/effects.server";

// ─── The web side of docs/adr/0014 ───
// Routes pass `context.get(effectsContext)` to domain functions. After the
// request, whatever was queued is flushed — awaited, whatever the response.

export const effectsContext = createContext<EffectSink>();

export const effectsMiddleware: MiddlewareFunction<Response> = async (
  { context },
  next
) => {
  const queue = createEffectQueue();
  context.set(effectsContext, queue);
  try {
    return await next();
  } finally {
    if (queue.effects.length > 0) await flush(queue.effects);
  }
};

async function flush(effects: readonly Effect[]) {
  const notificationTransport = defaultNotificationTransport();
  await flushEffects(effects, {
    mail: defaultMailTransport(),
    notification: (notification) =>
      notify(db, notification, notificationTransport),
  });
}
