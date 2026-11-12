# Coding standards

## Fail with a thrown response, not a return value

A loader or an action that cannot continue throws. It does not return an
error shape for the component to unpack.

```ts
if (!course) throw data("Course not found", { status: 404 });
```

The route then has one success path. A returned error shape gives every
component a second path to forget about.

## Parse untrusted input with a schema

Form data, search parameters and request bodies get a zod schema before the
values reach any query. Third-party payloads (Knock feed items, webhooks) get
one too: lint bans `as`, and the schema is the replacement for it.

## Put a module with its domain

`app/lib` holds one directory per domain: `notifications/`, `refunds/`,
`comments/` and so on. Lint makes a new module pick a directory; review checks
it picked the right one. A module belongs where the code that changes with it
lives. When a feature needs several new modules that fit no existing
directory, it gets a new one. `shared/` is only for helpers with no domain.

`app/routes` groups route modules by first URL segment: `courses.*` files live
in `routes/courses/`. Lint enforces this once two routes share a segment.

## Branch on a union with an exhaustive `switch`

When code picks a path by a union's discriminant (`effect.kind`,
`figures.kind`), write a `switch` with one `case` per member and
`x satisfies never` in `default`. A new member then breaks the build at every
branch point. Lint checks that a `switch` covers every member; review checks
that an `if`/`else` chain over a discriminant became a `switch`.

## A comment says why, in terms of the code beside it

A comment records a reason the code cannot show: a constraint, a trade-off,
a gotcha. It reads true for as long as the code next to it is unchanged, so
it describes neither what the function does nor who calls it. Both of those
change elsewhere and leave the comment stale.
