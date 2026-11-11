import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import type { FeedEventPayload } from "@knocklabs/client";
import { useKnockFeed } from "@knocklabs/react-core";
import { realtimeToasts } from "~/lib/notification-toasts";
import { WhenNotificationsEnabled } from "./notifications-provider";

/**
 * Shows a toast with a "View" action for each Notification that arrives live.
 * Mount once in the root, next to Sonner's <Toaster />.
 */
export function NotificationToasts() {
  return (
    <WhenNotificationsEnabled>
      <RealtimeToasts />
    </WhenNotificationsEnabled>
  );
}

function RealtimeToasts() {
  const { feedClient } = useKnockFeed();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Read at arrival time, so navigating doesn't rebind the listener.
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    const onRealtime = ({ items }: FeedEventPayload) => {
      for (const t of realtimeToasts(items, pathnameRef.current)) {
        toast(t.title, {
          id: t.id,
          description: t.description,
          action: { label: "View", onClick: () => navigate(t.url) },
        });
      }
    };
    feedClient.on("items.received.realtime", onRealtime);
    return () => feedClient.off("items.received.realtime", onRealtime);
  }, [feedClient, navigate]);

  return null;
}
