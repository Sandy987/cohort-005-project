import { describe, expect, it } from "vitest";
import type { FeedItem } from "@knocklabs/client";
import { notificationSummary } from "~/lib/notifications/notification-text";

// Knock markdown blocks: `content` is the Liquid template source, `rendered`
// is the HTML output with variables filled in.
function feedItem(content: string, rendered: string): FeedItem {
  return {
    id: "n1",
    blocks: [{ type: "markdown", name: "body", content, rendered }],
    data: { url: "/purchases" },
    inserted_at: "2026-11-11T10:00:00Z",
    read_at: null,
    seen_at: null,
  } as unknown as FeedItem;
}

const DECIDED_SOURCE =
  '{% if outcome == "approved" %}Your refund request for **{{ courseTitle }}** was approved.{% else %}Your refund request for **{{ courseTitle }}** was declined.{% endif %}{% if note %}\n\n> {{ note }}{% endif %}';

describe("notificationSummary", () => {
  it("reads the rendered body, not the Liquid source, with the note as detail", () => {
    const item = feedItem(
      DECIDED_SOURCE,
      "<p>Your refund request for <strong>Introduction to TypeScript</strong> was approved.</p>\n<blockquote>\n<p>Seats are in use &amp; can&#39;t be freed.</p>\n</blockquote>\n"
    );
    expect(notificationSummary(item)).toEqual({
      headline: "Your refund request for Introduction to TypeScript was approved.",
      detail: "Seats are in use & can't be freed.",
    });
    const { headline, detail } = notificationSummary(item);
    expect(`${headline} ${detail}`).not.toMatch(/\{\{|\{%|<\w/);
  });

  it("keeps escaped user text as literal text, never as tags", () => {
    const item = feedItem(
      "**{{ buyerName }}** requested a refund for **{{ courseTitle }}**.\n\n> {{ reason }}",
      "<p><strong>Ada</strong> requested a refund for <strong>Intro</strong>.</p>\n<blockquote>\n<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>\n</blockquote>\n"
    );
    const summary = notificationSummary(item);
    expect(summary).toEqual({
      headline: "Ada requested a refund for Intro.",
      detail: "<script>alert(1)</script>",
    });
    expect(summary.headline).not.toMatch(/\{\{|\{%|<\w/);
    expect(summary.detail).not.toMatch(/\{\{|\{%/);
  });

  it("has an empty detail when the body is one paragraph", () => {
    const item = feedItem(
      "**{{ replierName }}** replied to your comment on **{{ lessonTitle }}** in **{{ courseTitle }}**.",
      "<p><strong>Ada</strong> replied to your comment on <strong>Generics</strong> in <strong>TypeScript</strong>.</p>\n"
    );
    expect(notificationSummary(item)).toEqual({
      headline: "Ada replied to your comment on Generics in TypeScript.",
      detail: "",
    });
  });
});
