import { useEffect, useRef, useState } from "react";
import { isRequestInFlight, NetworkStatus } from "@knocklabs/client";
import type { FeedItem } from "@knocklabs/client";
import { CheckCheck, Mail, MailOpen } from "lucide-react";
import type { Route } from "./+types/notifications";
import { Button } from "~/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { useKnockFeed } from "@knocklabs/react-core";
import { NotificationItem } from "~/components/notifications/notification-item";
import { WhenNotificationsEnabled } from "~/components/notifications/notifications-provider";
import {
  inboxItems,
  inboxTabSchema,
  type InboxTab,
} from "~/lib/notification-inbox";

// The inbox: Unread (default) and All tabs, newest first. Visiting marks
// everything Seen (clears the sidebar badge); Read is per Notification, set by
// clicking through, the per-item toggle, or "Mark all as read".

export function meta(_: Route.MetaArgs) {
  return [{ title: "Notifications — Cadence" }];
}

export default function NotificationsPage() {
  return (
    <WhenNotificationsEnabled fallback={<Unavailable />}>
      <Inbox />
    </WhenNotificationsEnabled>
  );
}

function Unavailable() {
  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold">Notifications</h1>
      <p className="text-sm text-muted-foreground">
        Notifications are unavailable.
      </p>
    </div>
  );
}

function Inbox() {
  const { feedClient, useFeedStore } = useKnockFeed();
  const items = useFeedStore((state) => state.items);
  const networkStatus = useFeedStore((state) => state.networkStatus);
  const after = useFeedStore((state) => state.pageInfo.after);
  const unseenCount = useFeedStore((state) => state.metadata.unseen_count);
  const unreadCount = useFeedStore((state) => state.metadata.unread_count);

  const [tab, setTab] = useState<InboxTab>("unread");
  // Toggled read on this visit; kept on the Unread tab so the toggle can undo.
  const [kept, setKept] = useState<ReadonlySet<string>>(new Set());

  // Each tab is its own server-side filter, so Load more pages through the
  // right list. Knock skips a fetch while one is in flight, so wait for it.
  const fetchedTab = useRef<InboxTab | null>(null);
  useEffect(() => {
    if (fetchedTab.current === tab || isRequestInFlight(networkStatus)) return;
    fetchedTab.current = tab;
    feedClient.fetch({ status: tab });
  }, [feedClient, tab, networkStatus]);

  // On visit, and whenever something arrives while the page is open.
  useEffect(() => {
    if (unseenCount > 0) feedClient.markAllAsSeen();
  }, [feedClient, unseenCount]);

  function changeTab(next: string) {
    const parsed = inboxTabSchema.safeParse(next);
    if (!parsed.success) return;
    setTab(parsed.data);
    setKept(new Set());
  }

  function toggleRead(item: FeedItem) {
    if (item.read_at) {
      feedClient.markAsUnread(item);
    } else {
      feedClient.markAsRead(item);
      setKept((ids) => new Set(ids).add(item.id));
    }
  }

  function markAllRead() {
    setKept(new Set());
    feedClient.markAllAsRead();
  }

  const list = inboxItems(items, tab, kept);
  const loading =
    networkStatus === NetworkStatus.loading || fetchedTab.current !== tab;

  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={markAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck /> Mark all as read
        </Button>
      </div>

      <Tabs value={tab} onValueChange={changeTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="unread">Unread</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-lg border">
        {list.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            {loading
              ? "Loading…"
              : tab === "unread"
                ? "You're all caught up."
                : "No notifications yet."}
          </div>
        ) : (
          list.map((item) => {
            const toggleLabel = item.read_at ? "Mark as unread" : "Mark as read";
            return (
              <NotificationItem
                key={item.id}
                item={item}
                onClick={() => feedClient.markAsRead(item)}
                actions={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 self-center"
                    onClick={() => toggleRead(item)}
                    aria-label={toggleLabel}
                    title={toggleLabel}
                  >
                    {item.read_at ? <Mail /> : <MailOpen />}
                  </Button>
                }
              />
            );
          })
        )}
      </div>

      {after && list.length > 0 && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={() => feedClient.fetchNextPage({ status: tab })}
            disabled={isRequestInFlight(networkStatus)}
          >
            {networkStatus === NetworkStatus.fetchMore
              ? "Loading…"
              : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
