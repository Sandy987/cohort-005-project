import { describe, expect, it } from "vitest";
import type { FeedItem } from "@knocklabs/client";
import { realtimeToasts } from "./notification-toasts";

// `rendered` is Knock's HTML output; `content` (the Liquid source) is unused.
function feedItem(id: string, rendered: string, url: string): FeedItem {
  return {
    id,
    blocks: [
      { type: "markdown", name: "body", content: "{{ source }}", rendered },
    ],
    data: { url },
    inserted_at: "2026-11-11T10:00:00Z",
    read_at: null,
    seen_at: null,
  } as unknown as FeedItem;
}

const decided = feedItem(
  "n1",
  "<p>Your Refund Request for <strong>Introduction to TypeScript</strong> was approved.</p>\n<blockquote>\n<p>Sorry it wasn&#39;t a fit</p>\n</blockquote>\n",
  "/purchases"
);

describe("realtimeToasts", () => {
  it("toasts a live Notification with its headline, detail and View target", () => {
    expect(realtimeToasts([decided], "/courses")).toEqual([
      {
        id: "n1",
        title:
          "Your Refund Request for Introduction to TypeScript was approved.",
        description: "Sorry it wasn't a fit",
        url: "/purchases",
      },
    ]);
  });

  it("does not toast on /notifications, where the item appears in the list", () => {
    expect(realtimeToasts([decided], "/notifications")).toEqual([]);
    expect(realtimeToasts([decided], "/notifications/")).toEqual([]);
  });

  it("toasts each Notification that arrives together", () => {
    const reply = feedItem("n2", "<p>Ada replied to your comment</p>\n", "/courses/ts");
    expect(realtimeToasts([decided, reply], "/").map((t) => t.id)).toEqual([
      "n1",
      "n2",
    ]);
  });

  it("has no description when the Notification is one paragraph", () => {
    const reply = feedItem("n2", "<p>Ada replied to your comment</p>\n", "/courses/ts");
    expect(realtimeToasts([reply], "/")).toEqual([
      { id: "n2", title: "Ada replied to your comment", url: "/courses/ts" },
    ]);
  });
});
