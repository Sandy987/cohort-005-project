import { describe, expect, it } from "vitest";
import { inboxItems, inboxTabSchema } from "~/lib/notifications/notification-inbox";

const unread = { id: "a", read_at: null };
const read = { id: "b", read_at: "2026-11-10T10:00:00Z" };

describe("inboxItems", () => {
  it("All shows read and unread Notifications", () => {
    expect(inboxItems([unread, read], "all")).toEqual([unread, read]);
  });

  it("Unread hides Notifications already read", () => {
    expect(inboxItems([unread, read], "unread")).toEqual([unread]);
  });

  it("Unread keeps a Notification the person just toggled read, so they can undo it", () => {
    expect(inboxItems([unread, read], "unread", new Set(["b"]))).toEqual([
      unread,
      read,
    ]);
  });
});

describe("inboxTabSchema", () => {
  it("accepts the Unread and All tabs", () => {
    expect(inboxTabSchema.parse("unread")).toBe("unread");
    expect(inboxTabSchema.parse("all")).toBe("all");
  });

  it("rejects any other tab", () => {
    expect(inboxTabSchema.safeParse("archived").success).toBe(false);
  });
});
