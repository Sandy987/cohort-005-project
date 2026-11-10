# Knock in-app integration surface

Research for [#6](https://github.com/Sandy987/cohort-005-project/issues/6). Stack: React Router framework mode with SSR (package.json pins `react-router` 8.3.0, React 19), Node server, SQLite/Drizzle, Tailwind + shadcn.

Package versions checked (npm, 2026-11-10): `@knocklabs/react` 0.15.1, `@knocklabs/react-core` 0.17.1, `@knocklabs/client` 0.23.1, `@knocklabs/node` 1.41.1. Claims marked **(source)** were read from the published package contents (`npm pack`).

## TL;DR

- **Live updates come out of the box.** The feed client opens a Phoenix websocket to Knock's real-time service. Prebuilt feed components and `useNotificationStore` update when new messages arrive. There is no toast component; you build toasts by listening for `items.received.realtime`.
- **Prebuilt components can be themed, but they are not shadcn.** They use their own `rnf-` classes and `--rnf-*` CSS variables (92 of them). You can map these to shadcn tokens such as `--background` and `--primary`, but to get a real shadcn look you need headless hooks plus `app/components/ui` primitives. Middle option: keep the prebuilt popover and pass `renderItem` for the cells.
- **SSR:** the package ships with `"use client"`, and the socket is guarded by `typeof window`. But `KnockProvider` builds the client and calls `authenticate()` inside `useMemo`, so the render phase runs on the server too. By default that sends an inline identify request from the server render. Use `identificationStrategy="skip"` (and identify from the Node server instead), or mount Knock client-only.
- **Users:** the Knock user `id` is our own user id. Identify from the server with `users.update` or inline at trigger time. Enable enhanced security mode in production and sign an RS256 user JWT on the server with `signUserToken`.
- **Preferences:** per workflow, category, channel type, and channel, plus conditions. React gives you only a `usePreferences` hook. Knock also offers a hosted preference page (signed URL). There is no embeddable preference React component, so we build that UI.
- **Testing:** use a separate Development environment with its own keys. The dashboard test runner has sandbox mode. The Node SDK takes `baseURL`/`KNOCK_BASE_URL` and a custom `fetch`, so it is easy to stub. Knock has no local emulator.

## React SDK

### Packages

- `@knocklabs/react` provides prebuilt UI and re-exports everything from `@knocklabs/react-core`. `@knocklabs/react-core` holds the providers and hooks, and is built on `@knocklabs/client`, the JS SDK. https://docs.knock.app/in-app-ui/react/overview
- `@knocklabs/react` peer deps: `react`/`react-dom` ^17–^19. `next` and `@tanstack/react-router` are optional peers, used only for guide location sensors. It bundles Radix dialog/hover-card, `lucide-react`, and Knock's `@telegraph/*` design system. **(source: package.json)**

### Prebuilt components vs headless hooks

- Prebuilt feed components: `NotificationIconButton` (bell with an unseen/unread badge), `NotificationFeedPopover`, `NotificationFeed` (full page), and building blocks such as `NotificationCell`, `NotificationFeedHeader`, `MarkAsRead`, `UnseenBadge`, `Avatar`, and `EmptyFeed`. https://docs.knock.app/in-app-ui/react/overview, **(source: dist/types/index.d.ts)**
- Setup is `KnockProvider` (`apiKey`, `user`, `userToken`) wrapping `KnockFeedProvider` (`feedId` = in-app channel id). You also import `@knocklabs/react/dist/index.css` ("Required CSS import, unless you're overriding the styling"). https://docs.knock.app/in-app-ui/react/feed
- Toasts: there is no built-in component. The docs show `useKnockFeed().feedClient.on("items.received.realtime", ...)` driving `react-hot-toast`. For us, shadcn's Sonner would play the same role. https://docs.knock.app/in-app-ui/react/toasts
- Headless hooks: `useKnockClient`, `useNotifications(knockClient, channelId, options)`, `useNotificationStore(feedClient)` (gives `items` and `metadata.unread_count`/`unseen_count`), `useKnockFeed`, `usePreferences`, and `useFeedSettings`. The feed client also has `fetch()`, `markAsSeen`, `markAllAsSeen`, and related methods. https://docs.knock.app/in-app-ui/react/headless/feed, **(source)**
- `KnockProvider` also accepts `enabled`. When it is `false`, the client stays idle: no identify call, no requests, no websocket. **(source: KnockProvider.d.ts)**

### Theming with Tailwind/shadcn

- Most colours and font sizes can be overridden with `--rnf-` CSS variables (see `theme.css`). Every class is prefixed `rnf-`, so you can also drop Knock's CSS entirely and write your own. Dark mode is `colorMode="dark"` on `KnockFeedProvider`, which adds `rnf-*--dark` modifier classes. https://docs.knock.app/in-app-ui/react/feed
- The variables are a fixed palette of 92: `--rnf-color-brand-500`, `--rnf-color-gray-*`, `--rnf-button-*`, `--rnf-border-radius-*`, `--rnf-font-*`, and so on. **(source: dist/index.css)** You can point them at shadcn tokens in global CSS. Dark mode is a prop, not the `.dark` class, so you'd have to sync `colorMode` with our theme toggle.
- `NotificationFeed` takes `renderItem` to replace cells. `NotificationCell` accepts `children` and `avatar`. https://docs.knock.app/in-app-ui/react/feed
- Knock's own Next.js tutorial uses shadcn only for surrounding layout. It does not restyle Knock's components with Tailwind. https://knock.app/blog/how-to-add-an-in-app-notification-feed-to-nextjs-15

### SSR compatibility

- The ESM and CJS bundles begin with `"use client"`. **(source: dist/esm/index.mjs)** That directive does nothing in React Router, so components still render during SSR.
- The websocket is only created when `typeof window !== "undefined" && typeof WebSocket !== "undefined"`, so no socket opens on the server. **(source: client dist/esm/api.mjs)**
- Caveat: `useAuthenticatedKnockClient` runs `new Knock(...)` and `authenticate()` inside `useMemo`, which executes during SSR. With the default `identificationStrategy: "inline"` and a `user` object, `authenticate` fires `user.identify()` as an HTTP request, and it can also schedule the token-expiry `setTimeout`. **(source: react-core useAuthenticatedKnockClient.mjs; client knock.mjs)** Workable approaches:
  - pass `identificationStrategy="skip"` and identify users server-side, and/or
  - render the Knock subtree only after hydration (an `isClient` gate, or `enabled={isHydrated}`).
- The docs do not say anything explicit about SSR or React Router.

## Identifying users

- Use our internal user id as the Knock user `id`, which is the only required property. Reserved properties include `name`, `email`, `phone_number`, `avatar`, `locale`, and `timezone`, and custom properties can total up to 256 kB. https://docs.knock.app/managing-recipients/identifying-recipients
- Ways to identify: `PUT /v1/users/{id}` (Node: `client.users.update(id, {...})`), or inline by passing recipient objects in a trigger's `recipients`. Knock "guarantees that recipients are identified before executing any other action." Identify on sign-up and whenever name or email changes. https://docs.knock.app/managing-recipients/identifying-recipients
- Because user data lives in our SQLite, Knock holds a copy. Our user id is the join key, and we push updates to Knock.

### Enhanced security mode and user tokens

- Without enhanced security mode, "a request with your public key can act as any user." It is off by default and should be enabled in production. Once enabled, client requests without a signed user token are rejected. https://docs.knock.app/in-app-ui/security-and-authentication
- The token is an RS256 JWT signed with the environment's private signing key (Dashboard > Platform > API keys, shown once, stored in `KNOCK_SIGNING_KEY`). Claims are `sub` (user id, required), `iat`, and `exp`. Optional `explicit_grants` + `grants` narrow its scope. https://docs.knock.app/in-app-ui/security-and-authentication
- Node: `signUserToken(userId, { signingKey?, expiresInSeconds? })`, default 3600 s. It is exported from `@knocklabs/node` (index re-exports `lib/tokenSigner`). **(source: index.d.ts)** Pass the token to `KnockProvider userToken`. To refresh, use `onUserTokenExpiring`. Calling re-authenticate restarts the real-time connection. https://docs.knock.app/in-app-ui/security-and-authentication
- Fit for us: sign the token in a React Router loader (root or layout) and return it with the user. Match the expiry to the session, or refresh it via a resource route.

## Triggering workflows from the server (Node SDK)

```ts
import Knock from "@knocklabs/node";
const knock = new Knock({ apiKey: process.env.KNOCK_API_KEY }); // default env var
await knock.workflows.trigger("workflow-key", {
  recipients: ["user_123"], // or inline objects { id, name, email }
  data: { /* template variables */ },
  actor: "user_456",        // optional
  tenant: "team_1",         // optional
  cancellation_key: "...",  // optional, used with workflows.cancel
});
```

- README: https://github.com/knocklabs/knock-node. Trigger params `recipients`, `actor`, `data`, `tenant`, and `cancellation_key` come from **(source: resources/workflows.d.ts)**.
- The SDK is Stainless-generated and fully typed. It retries connection errors, 408/409/429, and 5xx twice by default (`maxRetries`), with a 60 s timeout. Errors are typed subclasses of `APIError`, such as `RateLimitError` for 429. https://github.com/knocklabs/knock-node
- Rate limits are per endpoint tier and scoped per environment, and return 429. https://docs.knock.app/api-reference/overview/rate-limits

## Preferences

- Granularity: `workflows`, `categories`, `channel_types` (email, SMS, in_app_feed, and so on), and `channels` (a specific channel by id). Categories and workflows can nest channel types to form a grid. Channel settings beat channel-type settings, and any applicable `false` blocks the send. Defaults are opt-in (`true`). Advanced preference conditions are also available. https://docs.knock.app/preferences/overview
- Merge order: recipient set (`default`, or a per-tenant set) > tenant default > environment default (set in the dashboard). `commercial_subscribed` is a separate switch. https://docs.knock.app/preferences/overview
- API: Node `users.getPreferences` / `setPreferences` / `unsetPreferences`, plus `bulkSetPreferences` for up to 1000 users. Writes overwrite unless `__persistence_strategy__: "merge"`. You can also pass inline preferences at trigger time. https://docs.knock.app/preferences/overview, **(source)**
- UI options:
  - Knock's **hosted preference center**: a no-code page reached via a signed URL, `default` set only.
  - A **custom preference center** we build in our app. The React SDK gives us `usePreferences()` (`preferences`, `setPreferences`, `getAllPreferences`, SWR-backed).
  - There is no prebuilt preference React component. https://docs.knock.app/preferences/overview, **(source: usePreferences.d.ts and index exports)**

## Real-time

- In-app clients "receive notifications over a websocket when new messages are sent to an in-app feed channel." Knock runs this service for you. https://docs.knock.app/in-app-ui/feeds/overview
- Implementation: `phoenix` Socket in `@knocklabs/client`. It reconnects on the `online` event and disconnects on page hidden by default (`disconnectOnPageHidden`). The feed option `auto_manage_socket_connection` (+ `_delay`, default 2000 ms) drops sockets for inactive tabs. `__experimentalCrossBrowserUpdates` syncs tabs via BroadcastChannel. **(source: client api.mjs, feed interfaces)**, https://docs.knock.app/in-app-ui/react/feed
- Message states: seen, read, interacted, archived. The feed returns unread, unseen, and read counts for badges. https://docs.knock.app/in-app-ui/feeds/overview
- Plan limits: in-app feeds and preferences are on all plans, with unlimited feeds per recipient and unlimited environments. Free plan covers up to 10,000 messages/month; Starter is $250/month for 50k, then $0.005/message. A "message" means one message to one user on one channel. Knock publishes no websocket or concurrent-connection limit. https://knock.app/pricing

## Testing and local dev

- Each environment (Development, Production, plus any extra you create) has its own API keys, users, messages, and logs. Workflows are version-controlled: commit in Development, then promote to Production. The CLI and Management API target Development by default. https://docs.knock.app/concepts/environments
- Dashboard test runner: run a whole workflow or a single step. Sandbox mode (`settings.sandbox_mode`) renders messages without delivering to providers, and `skip_delay` skips delays. The CLI can trigger runs with `knock workflow run`. https://docs.knock.app/send-notifications/testing-workflows
- Knock has no local emulator or offline mode. Local dev hits Knock's hosted Development environment, and the in-app feed works there for real.
- Mocking:
  - Node: `new Knock({ baseURL, fetch })`. The base URL defaults to `KNOCK_BASE_URL`. You can point it at an MSW/stub server, or inject a fake client behind our own `notify()` module. **(source: client.d.ts)**
  - React: `KnockProvider enabled={false}` keeps the client fully idle, which helps tests and Storybook. No official mock helpers are documented.
