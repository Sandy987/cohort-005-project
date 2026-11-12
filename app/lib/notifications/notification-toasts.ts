import type { FeedItem } from "@knocklabs/client";
import { notificationSummary, notificationUrl } from "~/lib/notifications/notification-text";

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
    const { headline, detail } = notificationSummary(item);
    return {
      id: item.id,
      title: headline,
      ...(detail && { description: detail }),
      url: notificationUrl(item),
    };
  });
}
