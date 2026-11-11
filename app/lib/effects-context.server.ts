import { createContext, type MiddlewareFunction } from "react-router";
import { db } from "~/db";
import { defaultMailTransport } from "~/lib/mailer.server";
import {
  defaultNotificationTransport,
  notify,
} from "~/lib/notifications.server";
import {
  createEffectQueue,
  flushEffects,
  type EffectSink,
} from "~/lib/effects.server";

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
    const notificationTransport = defaultNotificationTransport();
    await flushEffects(queue.effects, {
      mail: defaultMailTransport(),
      notification: (notification) =>
        notify(db, notification, notificationTransport),
    });
  }
};
