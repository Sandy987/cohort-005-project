import { useEffect } from "react";
import type { Route } from "./+types/notifications";
import { NotificationItem } from "~/components/notifications/notification-item";
import {
  useNotificationsEnabled,
  useNotificationsFeed,
} from "~/components/notifications/notifications-provider";

// Basic inbox: newest first, each item links to its target, and visiting
// marks everything seen (clears the sidebar badge). The full inbox (tabs,
// read toggles, load more) is #22.

export function meta(_: Route.MetaArgs) {
  return [{ title: "Notifications — Cadence" }];
}

export default function NotificationsPage() {
  const enabled = useNotificationsEnabled();
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Notifications</h1>
      {enabled ? (
        <NotificationsList />
      ) : (
        <p className="text-sm text-muted-foreground">
          Notifications are unavailable.
        </p>
      )}
    </div>
  );
}

function NotificationsList() {
  const { feedClient, useFeedStore } = useNotificationsFeed();
  const items = useFeedStore((state) => state.items);
  const loading = useFeedStore((state) => state.loading);
  const unseenCount = useFeedStore((state) => state.metadata.unseen_count);

  // On visit, and whenever something arrives while the page is open.
  useEffect(() => {
    if (unseenCount > 0) feedClient.markAllAsSeen();
  }, [feedClient, unseenCount]);

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center text-sm text-muted-foreground">
        {loading ? "Loading…" : "You're all caught up."}
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      {items.map((item) => (
        <NotificationItem
          key={item.id}
          item={item}
          onClick={() => feedClient.markAsRead(item)}
        />
      ))}
    </div>
  );
}
