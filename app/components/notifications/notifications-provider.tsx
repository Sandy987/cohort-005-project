import { createContext, useContext, useEffect, useState } from "react";
import {
  KnockFeedProvider,
  KnockProvider,
  useKnockFeed,
} from "@knocklabs/react-core";
import type { KnockClientConfig } from "~/lib/knock-client.server";

// Mounts Knock for the signed-in user. With no config (signed out, or Knock
// keys missing) nothing Knock-related is mounted and
// useNotificationsEnabled() is false, so Notifications UI hides itself.
//
// Both providers are keyed by user id: a DevUI switch, login or logout
// remounts them and reconnects the feed as the new user.

const NotificationsEnabledContext = createContext(false);

export function useNotificationsEnabled() {
  return useContext(NotificationsEnabledContext);
}

/**
 * The signed-in user's feed: `feedClient` for actions (markAllAsSeen,
 * markAsRead, fetchNextPage, on("items.received.realtime")), and
 * `useFeedStore(selector)` for state (items, metadata.unseen_count, pageInfo).
 * Only call it below a component that checked useNotificationsEnabled().
 */
export const useNotificationsFeed = useKnockFeed;

export function NotificationsProvider({
  config,
  children,
}: {
  config: KnockClientConfig | null;
  children: React.ReactNode;
}) {
  if (!config) return <>{children}</>;
  return (
    <KnockUserProvider key={config.userId} config={config}>
      {children}
    </KnockUserProvider>
  );
}

async function refreshUserToken(): Promise<string | void> {
  const response = await fetch("/api/knock-token");
  if (!response.ok) return;
  const { token } = (await response.json()) as { token: string | null };
  return token ?? undefined;
}

function KnockUserProvider({
  config,
  children,
}: {
  config: KnockClientConfig;
  children: React.ReactNode;
}) {
  // The root loader re-mints a token on every revalidation. Keep the first
  // one: handing KnockProvider a new token would re-authenticate the client.
  // Knock refreshes it through onUserTokenExpiring before it expires.
  const [userToken] = useState(config.userToken);

  return (
    <KnockProvider
      apiKey={config.publicKey}
      user={{ id: config.userId }}
      userToken={userToken}
      identificationStrategy="skip"
      onUserTokenExpiring={refreshUserToken}
    >
      <KnockFeedProvider key={config.userId} feedId={config.feedChannelId}>
        <NotificationsEnabledContext.Provider value={true}>
          <InitialFetch />
          {children}
        </NotificationsEnabledContext.Provider>
      </KnockFeedProvider>
    </KnockProvider>
  );
}

/** Loads the first page (and the unseen count) once the feed connects. */
function InitialFetch() {
  const { feedClient } = useKnockFeed();
  useEffect(() => {
    feedClient.fetch();
  }, [feedClient]);
  return null;
}
