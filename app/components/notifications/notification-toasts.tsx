import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import type { FeedEventPayload } from "@knocklabs/client";
import { realtimeToasts } from "~/lib/notification-toasts";
import {
  useNotificationsEnabled,
  useNotificationsFeed,
} from "./notifications-provider";

/**
 * Shows a toast with a "View" action for each Notification that arrives live.
 * Mount once in the app shell, next to Sonner's <Toaster />.
 */
export function NotificationToasts() {
  if (!useNotificationsEnabled()) return null;
  return <RealtimeToasts />;
}

function RealtimeToasts() {
  const { feedClient } = useNotificationsFeed();
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
