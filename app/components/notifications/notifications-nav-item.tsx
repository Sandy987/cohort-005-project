import { NavLink } from "react-router";
import { Bell } from "lucide-react";
import { useKnockFeed } from "@knocklabs/react-core";
import { cn } from "~/lib/shared/utils";
import { WhenNotificationsEnabled } from "./notifications-provider";

/** Sidebar item for /notifications. Hidden when Knock isn't mounted. */
export function NotificationsNavItem({ className }: { className: string }) {
  return (
    <WhenNotificationsEnabled>
      <NotificationsNavLink className={className} />
    </WhenNotificationsEnabled>
  );
}

function NotificationsNavLink({ className }: { className: string }) {
  const { useFeedStore } = useKnockFeed();
  const unseenCount = useFeedStore((state) => state.metadata.unseen_count);

  return (
    <NavLink
      to="/notifications"
      className={({ isActive }) =>
        cn(
          className,
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        )
      }
    >
      <Bell className="size-4" />
      Notifications
      <UnseenBadge count={unseenCount} />
    </NavLink>
  );
}

function formatUnseenCount(count: number): string | null {
  if (count <= 0) return null;
  return count > 9 ? "9+" : String(count);
}

function UnseenBadge({ count }: { count: number }) {
  const label = formatUnseenCount(count);
  if (!label) return null;
  return (
    <span
      className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-white"
      aria-label={`${count} unseen`}
    >
      {label}
    </span>
  );
}
