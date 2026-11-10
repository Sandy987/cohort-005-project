// PROTOTYPE — throwaway. Four structurally different answers to
// "How should Notifications look and be presented" (wayfinder ticket #8).
//   A  Bell in sidebar header → shadcn-style popover; open clears badge (seen),
//      click item marks read; live arrivals toast.
//   B  "Notifications" sidebar nav item with unread count → slide-out panel
//      grouped New/Earlier, per-item read/unread toggle; NO toasts.
//   C  Sidebar nav item with dot → full /notifications inbox page
//      (Unread/All tabs, mark all read); live arrivals toast.
//   D  Knock's prebuilt NotificationIconButton + NotificationFeedPopover,
//      live against the Knock Development env (real websocket).
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router";
import { Popover, Dialog } from "radix-ui";
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Receipt,
  CircleCheck,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  useFakeFeed,
  markAllSeen,
  markRead,
  markUnread,
  markAllRead,
  timeAgo,
  type FakeNotification,
} from "./fake-store";

export const VARIANTS = {
  A: "Header bell + popover + toasts",
  B: "Nav item + slide-out panel, no toasts",
  C: "Nav item + full inbox page + toasts",
  D: "Knock prebuilt popover (live)",
} as const;
export type VariantKey = keyof typeof VARIANTS;

function TypeIcon({ type }: { type: FakeNotification["type"] }) {
  const cls = "size-4";
  if (type === "comment-reply") return <MessageSquare className={cls} />;
  if (type === "open-refund-request") return <Receipt className={cls} />;
  return <CircleCheck className={cls} />;
}

function Item({
  n,
  compact,
  showToggle,
  onNavigate,
}: {
  n: FakeNotification;
  compact?: boolean;
  showToggle?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex gap-3 border-b px-4 py-3 last:border-b-0",
        !n.read && "bg-primary/5"
      )}
    >
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <TypeIcon type={n.type} />
      </div>
      <Link
        to={n.href}
        onClick={() => {
          markRead(n.id);
          onNavigate?.();
        }}
        className="min-w-0 flex-1"
      >
        <div className={cn("text-sm", !n.read && "font-semibold")}>
          {n.title}
        </div>
        {n.body && (
          <div
            className={cn(
              "mt-0.5 text-sm text-muted-foreground",
              compact && "line-clamp-1"
            )}
          >
            {n.body}
          </div>
        )}
        <div className="mt-1 text-xs text-muted-foreground">
          {timeAgo(n.minutesAgo)}
        </div>
      </Link>
      {!n.read && !showToggle && (
        <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
      )}
      {showToggle && (
        <button
          title={n.read ? "Mark as unread" : "Mark as read"}
          onClick={() => (n.read ? markUnread(n.id) : markRead(n.id))}
          className="self-start rounded p-1 text-muted-foreground opacity-0 hover:bg-accent group-hover:opacity-100"
        >
          {n.read ? (
            <span className="block size-2 rounded-full border border-primary" />
          ) : (
            <Check className="size-4" />
          )}
        </button>
      )}
    </div>
  );
}

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
      {count > 9 ? "9+" : count}
    </span>
  );
}

// ─── Variant A ──────────────────────────────────────────────────────────────
export function VariantAHeader() {
  const { items, unseenCount } = useFakeFeed();
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) markAllSeen();
      }}
    >
      <Popover.Trigger asChild>
        <button
          className="relative ml-auto rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
          title="Notifications"
        >
          <Bell className="size-5" />
          <Badge count={unseenCount} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="right"
          align="start"
          sideOffset={12}
          className="z-50 w-96 rounded-lg border bg-popover text-popover-foreground shadow-lg"
        >
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="font-semibold">Notifications</div>
            <Button variant="ghost" size="xs" onClick={markAllRead}>
              <CheckCheck /> Mark all read
            </Button>
          </div>
          <div className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                You're all caught up.
              </div>
            ) : (
              items.map((n) => (
                <Item
                  key={n.id}
                  n={n}
                  compact
                  onNavigate={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

// ─── Variant B ──────────────────────────────────────────────────────────────
export function VariantBNav() {
  const { items, unreadCount } = useFakeFeed();
  const [open, setOpen] = useState(false);
  const fresh = items.filter((n) => !n.read);
  const earlier = items.filter((n) => n.read);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            open
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Bell className="size-4" />
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto rounded-full bg-primary px-2 text-xs font-semibold text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 left-56 z-40 bg-black/20" />
        <Dialog.Content className="fixed inset-y-0 left-56 z-50 flex w-[26rem] flex-col border-r bg-background shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Dialog.Title className="text-lg font-semibold">
              Notifications
            </Dialog.Title>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="xs" onClick={markAllRead}>
                <CheckCheck /> Mark all read
              </Button>
              <Dialog.Close className="rounded p-1 hover:bg-accent">
                <X className="size-4" />
              </Dialog.Close>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Section title="New" list={fresh} close={() => setOpen(false)} />
            <Section
              title="Earlier"
              list={earlier}
              close={() => setOpen(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Section({
  title,
  list,
  close,
}: {
  title: string;
  list: FakeNotification[];
  close: () => void;
}) {
  if (list.length === 0) return null;
  return (
    <div>
      <div className="bg-muted/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {list.map((n) => (
        <Item key={n.id} n={n} showToggle onNavigate={close} />
      ))}
    </div>
  );
}

// ─── Variant C ──────────────────────────────────────────────────────────────
export function VariantCNav() {
  const { unreadCount } = useFakeFeed();
  return (
    <NavLink
      to="/notifications?variant=C"
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <span className="relative">
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive" />
        )}
      </span>
      Notifications
    </NavLink>
  );
}

export function VariantCPage() {
  const { items, unreadCount } = useFakeFeed();
  const [tab, setTab] = useState<"unread" | "all">("unread");
  const list = tab === "unread" ? items.filter((n) => !n.read) : items;
  return (
    <div className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount} unread
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck /> Mark all as read
        </Button>
      </div>
      <div className="mb-4 flex gap-1 border-b">
        {(["unread", "all"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium capitalize",
              tab === t
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="rounded-lg border">
        {list.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            Nothing here. You're all caught up.
          </div>
        ) : (
          list.map((n) => <Item key={n.id} n={n} showToggle />)
        )}
      </div>
    </div>
  );
}

// ─── Variant D (real Knock, client-only) ───────────────────────────────────
export function VariantDHeader({
  apiKey,
  feedId,
  user,
}: {
  apiKey: string | null;
  feedId: string | null;
  user: { id: number; name: string } | null;
}) {
  const [Mod, setMod] = useState<typeof import("@knocklabs/react") | null>(
    null
  );
  useEffect(() => {
    import("@knocklabs/react").then(setMod);
    import("@knocklabs/react/dist/index.css");
  }, []);
  if (!apiKey || !feedId || !user)
    return (
      <span className="ml-auto text-xs text-destructive">
        Knock env/user missing
      </span>
    );
  if (!Mod) return <Bell className="ml-auto size-5 opacity-30" />;
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  return (
    <Mod.KnockProvider
      apiKey={apiKey}
      user={{ id: String(user.id), name: user.name }}
    >
      <Mod.KnockFeedProvider
        feedId={feedId}
        colorMode={isDark ? "dark" : "light"}
      >
        <KnockBell Mod={Mod} />
      </Mod.KnockFeedProvider>
    </Mod.KnockProvider>
  );
}

function KnockBell({ Mod }: { Mod: typeof import("@knocklabs/react") }) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <div className="ml-auto">
      <Mod.NotificationIconButton
        ref={ref}
        onClick={() => setVisible(!visible)}
      />
      <Mod.NotificationFeedPopover
        buttonRef={ref}
        isVisible={visible}
        onClose={() => setVisible(false)}
        placement="right-start"
      />
    </div>
  );
}
