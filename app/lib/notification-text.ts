import type { FeedItem } from "@knocklabs/client";

// How a Notification from the Knock feed reads. Templates live in
// knock/workflows/; every trigger's `data.url` is the link target.

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

/** The first line as the headline; the rest, joined, as the detail. */
export function notificationSummary(item: FeedItem): {
  headline: string;
  detail: string;
} {
  const [headline, ...rest] = notificationText(item).split("\n");
  return { headline, detail: rest.join(" ").trim() };
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
