import { createContext, useContext, useEffect, useState } from "react";
import {
  KnockFeedProvider,
  KnockProvider,
  useKnockFeed,
} from "@knocklabs/react-core";
import { z } from "zod";
import type { KnockClientConfig } from "~/lib/notifications/knock-client.server";

// Mounts Knock for the signed-in user. With no config (signed out, or Knock
// keys missing) nothing Knock-related is mounted, so Notifications UI wrapped
// in <WhenNotificationsEnabled> hides itself. Below that wrapper, components
// read the feed with Knock's useKnockFeed().
//
// Both providers are keyed by user id: a DevUI switch, login or logout
// remounts them and reconnects the feed as the new user.

const NotificationsEnabledContext = createContext(false);

/** Renders `children` only when Knock is mounted, `fallback` otherwise. */
export function WhenNotificationsEnabled({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const enabled = useContext(NotificationsEnabledContext);
  return <>{enabled ? children : fallback}</>;
}

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

const tokenResponseSchema = z.object({ token: z.string() });

/** A fresh token, or nothing (signed out, Knock unavailable) to let it lapse. */
async function refreshUserToken(): Promise<string | void> {
  const response = await fetch("/api/knock-token").catch(() => null);
  if (!response?.ok) return;
  const parsed = tokenResponseSchema.safeParse(await response.json());
  return parsed.success ? parsed.data.token : undefined;
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

  // Authenticate in the browser only. During SSR an enabled client would arm
  // Knock's token-refresh timer in the server process; when it fired, the
  // relative fetch in refreshUserToken rejected unhandled and crashed Node.
  const [inBrowser, setInBrowser] = useState(false);
  useEffect(() => setInBrowser(true), []);

  return (
    <KnockProvider
      apiKey={config.publicKey}
      user={{ id: config.userId }}
      userToken={userToken}
      identificationStrategy="skip"
      onUserTokenExpiring={refreshUserToken}
      enabled={inBrowser}
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
