# Store whether a person is Muted in Cadence, not in Knock

Notifications are delivered through Knock, which has its own per-person preferences, but whether a person is Muted lives in Cadence's database and Cadence skips Muted recipients before triggering a Knock workflow. We do this so the Settings page, where the Muted switch sits, loads without calling Knock. The page doesn't depend on Knock being reachable or fast, and loading it makes no extra Knock calls.

## Considered Options

- **Knock preferences (`in_app_feed: false` channel-type preference).** Rejected: Knock would skip delivery for us with no migration, but every Settings load would wait on a Knock API call to show the switch.

## Consequences

Knock's own preferences for a person stay at their defaults and aren't read. If someone later sets them through Knock, they apply on top of Cadence's Muted check, so the two can disagree.
