import { createContext, type MiddlewareFunction } from "react-router";
import { defaultMailTransport } from "~/lib/mailer.server";
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
    await flushEffects(queue.effects, {
      mail: defaultMailTransport(),
      // Notifications have no transport yet; #17 adds one.
      notification: async () => {},
    });
  }
};
