import { describe, expect, it } from "vitest";
import type { FeedItem } from "@knocklabs/client";
import { notificationSummary } from "./notification-text";

function feedItem(markdown: string): FeedItem {
  return {
    id: "n1",
    blocks: [
      { type: "markdown", name: "body", content: markdown, rendered: "" },
    ],
    data: { url: "/purchases" },
    inserted_at: "2026-11-11T10:00:00Z",
    read_at: null,
    seen_at: null,
  } as unknown as FeedItem;
}

describe("notificationSummary", () => {
  it("splits the body into a plain-text headline and the quoted detail", () => {
    const item = feedItem(
      "Your refund request for **Introduction to TypeScript** was declined.\n\n> Seats are in use."
    );
    expect(notificationSummary(item)).toEqual({
      headline: "Your refund request for Introduction to TypeScript was declined.",
      detail: "Seats are in use.",
    });
  });

  it("has an empty detail when the body is one line", () => {
    expect(notificationSummary(feedItem("**Ada** replied to your comment"))).toEqual({
      headline: "Ada replied to your comment",
      detail: "",
    });
  });
});
