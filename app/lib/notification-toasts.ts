import type { FeedItem } from "@knocklabs/client";
import {
  notificationText,
  notificationUrl,
} from "~/components/notifications/notification-item";

// Live Notifications (Knock's `items.received.realtime`) become toasts with a
// "View" action. Items from the first page load never arrive through that
// event, so they never toast.

export type NotificationToast = {
  id: string;
  title: string;
  description?: string;
  url: string;
};

/** Toasts for live arrivals; none on /notifications, which lists them. */
export function realtimeToasts(
  items: FeedItem[],
  pathname: string
): NotificationToast[] {
  if (pathname.replace(/\/+$/, "") === "/notifications") return [];
  return items.map((item) => {
    const [title, ...rest] = notificationText(item).split("\n");
    const description = rest.join(" ").trim();
    return {
      id: item.id,
      title,
      ...(description && { description }),
      url: notificationUrl(item),
    };
  });
}
