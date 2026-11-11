import { describe, expect, it } from "vitest";
import { inboxItems } from "./notification-inbox";

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
