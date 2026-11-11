import { Link } from "react-router";
import type { FeedItem } from "@knocklabs/client";
import { cn } from "~/lib/utils";

// One Notification from the Knock feed. Templates live in knock/workflows/;
// every trigger's `data.url` is the link target.

/** Where clicking the Notification goes. */
export function notificationUrl(item: FeedItem): string {
  const url = (item.data as { url?: unknown } | null)?.url;
  return typeof url === "string" && url.startsWith("/") ? url : "/";
}

/**
 * The body as plain text. The markdown source is used rather than Knock's
 * rendered HTML so that user-written text (decision notes, replies) is never
 * injected as HTML.
 */
export function notificationText(item: FeedItem): string {
  for (const block of item.blocks) {
    if (block.type === "markdown" || block.type === "text") {
      return toPlainText(block.content);
    }
  }
  return "";
}

function toPlainText(markdown: string): string {
  return markdown
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .trim();
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

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
  const [headline, ...rest] = notificationText(item).split("\n");
  const detail = rest.join(" ").trim();

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
