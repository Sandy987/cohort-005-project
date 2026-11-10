// PROTOTYPE — throwaway. In-memory fake Notification feed for variants A–C of
// "How should Notifications look and be presented". Mirrors Knock's model:
// `seen` (badge cleared) is separate from `read` (item opened).
import { useSyncExternalStore } from "react";
import { toast } from "sonner";

export type NotificationType =
  | "refund-request-decided"
  | "open-refund-request"
  | "comment-reply";

export interface FakeNotification {
  id: string;
  type: NotificationType;
  actorName: string;
  title: string;
  body?: string;
  href: string;
  minutesAgo: number;
  seen: boolean;
  read: boolean;
}

const BASE: FakeNotification[] = [
  {
    id: "n1",
    type: "comment-reply",
    actorName: "Priya Patel",
    title: "Priya Patel replied to your comment",
    body: "“Good catch — the useEffect cleanup runs before the next effect, not on unmount only.”",
    href: "/courses",
    minutesAgo: 12,
    seen: false,
    read: false,
  },
  {
    id: "n2",
    type: "refund-request-decided",
    actorName: "Platform Admin",
    title: "Your Refund Request for “TypeScript Fundamentals” was declined",
    body: "Note: Refund window closed — you completed 80% of the course.",
    href: "/courses",
    minutesAgo: 180,
    seen: false,
    read: false,
  },
  {
    id: "n3",
    type: "refund-request-decided",
    actorName: "Platform Admin",
    title: "Your Refund Request for “React Patterns” was approved",
    href: "/courses",
    minutesAgo: 60 * 26,
    seen: true,
    read: true,
  },
  {
    id: "n4",
    type: "comment-reply",
    actorName: "Marcus Lee",
    title: "Marcus Lee replied to your comment",
    body: "“Same here, the quiz answer seems off.”",
    href: "/courses",
    minutesAgo: 60 * 24 * 4,
    seen: true,
    read: true,
  },
];

const ADMIN_EXTRA: FakeNotification[] = [
  {
    id: "a1",
    type: "open-refund-request",
    actorName: "Jordan Kim",
    title: "Jordan Kim opened a Refund Request for “Node.js Deep Dive”",
    body: "“The course content didn't match the description.”",
    href: "/admin/refunds",
    minutesAgo: 5,
    seen: false,
    read: false,
  },
  {
    id: "a2",
    type: "open-refund-request",
    actorName: "Sam Rivera",
    title: "Sam Rivera opened a Refund Request for “React Patterns”",
    href: "/admin/refunds",
    minutesAgo: 60 * 5,
    seen: true,
    read: false,
  },
];

const INCOMING: Omit<FakeNotification, "id" | "minutesAgo" | "seen" | "read">[] =
  [
    {
      type: "comment-reply",
      actorName: "Alex Chen",
      title: "Alex Chen replied to your comment",
      body: "“Thanks, that fixed it for me!”",
      href: "/courses",
    },
    {
      type: "refund-request-decided",
      actorName: "Platform Admin",
      title: "Your Refund Request for “Node.js Deep Dive” was approved",
      href: "/courses",
    },
    {
      type: "open-refund-request",
      actorName: "Taylor Brooks",
      title: "Taylor Brooks opened a Refund Request for “TypeScript Fundamentals”",
      href: "/admin/refunds",
    },
  ];

let items: FakeNotification[] = [];
let seededFor: string | null = null;
let toastsEnabled = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function seedFor(role: string | null) {
  const key = role ?? "anon";
  if (seededFor === key) return;
  seededFor = key;
  items = role === "admin" ? [...ADMIN_EXTRA, ...BASE] : [...BASE];
  items = items.map((n) => ({ ...n }));
}

export function setToastsEnabled(on: boolean) {
  toastsEnabled = on;
}

let incomingIdx = 0;
export function simulateIncoming() {
  const next = INCOMING[incomingIdx++ % INCOMING.length];
  const n: FakeNotification = {
    ...next,
    id: `live-${Date.now()}`,
    minutesAgo: 0,
    seen: false,
    read: false,
  };
  items = [n, ...items];
  emit();
  if (toastsEnabled) {
    toast(n.title, {
      description: n.body,
      action: { label: "View", onClick: () => markRead(n.id) },
    });
  }
}

export function markAllSeen() {
  items = items.map((n) => ({ ...n, seen: true }));
  emit();
}
export function markRead(id: string) {
  items = items.map((n) => (n.id === id ? { ...n, read: true, seen: true } : n));
  emit();
}
export function markUnread(id: string) {
  items = items.map((n) => (n.id === id ? { ...n, read: false } : n));
  emit();
}
export function markAllRead() {
  items = items.map((n) => ({ ...n, read: true, seen: true }));
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
const getSnapshot = () => items;

export function useFakeFeed() {
  const list = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    items: list,
    unseenCount: list.filter((n) => !n.seen).length,
    unreadCount: list.filter((n) => !n.read).length,
  };
}

export function timeAgo(minutes: number) {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / (60 * 24))}d ago`;
}
