import type { FeedItem } from "@knocklabs/client";
import { z } from "zod";

// How a Notification from the Knock feed reads. Templates live in
// knock/workflows/; every trigger's `data.url` is the link target.

/** Where clicking the Notification goes. */
export function notificationUrl(item: FeedItem): string {
  const parsed = notificationDataSchema.safeParse(item.data);
  return parsed.success ? parsed.data.url : "/";
}

const notificationDataSchema = z.object({
  url: z.string().startsWith("/"),
});

/**
 * The body as plain text, one line per block element. Built from Knock's
 * `rendered` HTML (`content` is the Liquid template source). Tags are
 * stripped and entities decoded, so callers must render the result as React
 * text, never as HTML: user-written text (notes, reasons) arrives escaped and
 * comes out here as literal characters.
 */
export function notificationText(item: FeedItem): string {
  for (const block of item.blocks) {
    if (block.type === "markdown" || block.type === "text") {
      return htmlToPlainText(block.rendered);
    }
  }
  return "";
}

/** The first line as the headline; the rest, joined, as the detail. */
export function notificationSummary(item: FeedItem): {
  headline: string;
  detail: string;
} {
  const [headline = "", ...rest] = notificationText(item).split("\n");
  return { headline, detail: rest.join(" ") };
}

const BLOCK_BOUNDARY =
  /<\/?(?:p|div|blockquote|h[1-6]|li|ul|ol|pre|hr|tr)\b[^>]*>|<br\s*\/?>/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function htmlToPlainText(html: string): string {
  const text = html
    .replace(BLOCK_BOUNDARY, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, decodeEntity);
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function decodeEntity(match: string, entity: string): string {
  if (entity[0] === "#") {
    const code =
      entity[1] === "x" || entity[1] === "X"
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  }
  return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
