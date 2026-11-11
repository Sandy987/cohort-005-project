// Which Notifications the /notifications inbox lists on each tab.

export type InboxTab = "unread" | "all";

type InboxItem = { id: string; read_at: string | null };

/**
 * Unread hides read Notifications, except those in `kept`: ones the person
 * toggled read on this visit stay put so the toggle can undo it.
 */
export function inboxItems<T extends InboxItem>(
  items: T[],
  tab: InboxTab,
  kept: ReadonlySet<string> = new Set()
): T[] {
  if (tab === "all") return items;
  return items.filter((item) => !item.read_at || kept.has(item.id));
}
