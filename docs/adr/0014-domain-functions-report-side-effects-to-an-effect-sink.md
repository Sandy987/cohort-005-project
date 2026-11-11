# Domain functions report side effects to an EffectSink; the web layer runs them

Any side effect that should follow a committed domain change, such as an email or a Notification, is reported by the domain function to an `EffectSink`. The function takes the sink as a required parameter and pushes effects only after its transaction commits. The web layer runs them: a root middleware puts a queue into React Router context, and after the request it flushes the queue, running each effect independently and swallowing and logging any failure. This is the single mechanism for this kind of side effect. Domain functions never deliver effects themselves, and routes never invoke them directly. We chose this because a required parameter makes forgetting an effect a type error. Under the alternatives, every route had to remember a call after the domain function returned.

## Considered Options

- **Routes call `sendEmail` / `notify` after the domain function returns** (the original shape), or one `deliver(result.effects)` helper per route. Rejected: one forgettable line per route.
- **Routes push returned effects onto the context queue.** Rejected: just as forgettable as a helper, with more moving parts.
- **Domain-event bus.** Rejected: implicit and hard to trace, and the publish call can still be forgotten.
- **DB outbox table + worker.** Rejected for now: atomic and durable, but needs a worker process alongside the single SQLite file (ADR 0006). The failure policy is already swallow + log.

## Consequences

- Effects are pushed after `db.transaction(...)` returns, never inside it, so a rollback leaves nothing queued. The middleware therefore flushes whatever is queued, regardless of the response status.
- An effect failure never fails a request whose write already committed. This changes email, which previously surfaced Postmark errors as a 500.
- The flush is awaited, so response latency includes delivery. Effects are lost if the process dies after commit but before the flush, which is the trade-off against an outbox.
- Domain tests pass a recording sink. Any non-request caller (scripts, seeds) must supply its own sink.
