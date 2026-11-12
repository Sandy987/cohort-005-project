import { Link } from "react-router";
import type { FeedItem } from "@knocklabs/client";
import {
  notificationSummary,
  notificationUrl,
  timeAgo,
} from "~/lib/notification-text";
import { cn } from "~/lib/utils";

// One Notification from the Knock feed, as a row in the inbox.

export function NotificationItem({
  item,
  onClick,
  actions,
}: {
  item: FeedItem;
  onClick?: () => void;
  /** Extra controls on the right, e.g. a read/unread toggle (#22). */
  actions?: React.ReactNode;
}) {
  const unread = !item.read_at;
  const { headline, detail } = notificationSummary(item);

  return (
    <div
      className={cn(
        "group relative flex gap-3 border-b px-4 py-3 last:border-b-0",
        unread && "bg-primary/5"
      )}
    >
      <Link
        to={notificationUrl(item)}
        onClick={onClick}
        className="min-w-0 flex-1"
      >
        <div className={cn("text-sm", unread && "font-semibold")}>
          {headline}
        </div>
        {detail && (
          <div className="mt-0.5 text-sm text-muted-foreground">{detail}</div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {timeAgo(item.inserted_at)}
        </div>
      </Link>
      {actions}
    </div>
  );
}
