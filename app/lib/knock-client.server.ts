import { signUserToken } from "@knocklabs/node";

// What the browser needs to open a user's in-app feed over Knock's websocket.
// Knock enhanced security is on everywhere, so the client also needs a user
// token signed with KNOCK_SIGNING_KEY. When nobody is signed in, or any of
// the keys is missing or unusable, there is no config: the app mounts no
// Knock provider and hides the Notifications sidebar item.

type Env = Record<string, string | undefined>;

export interface KnockClientConfig {
  publicKey: string;
  feedChannelId: string;
  /** The Cadence user id, stringified: Cadence ids are Knock ids. */
  userId: string;
  userToken: string;
}

const TOKEN_TTL_SECONDS = 60 * 60;

export async function knockClientConfig(
  userId: number | null,
  env: Env = process.env
): Promise<KnockClientConfig | null> {
  const publicKey = env.KNOCK_PUBLIC_API_KEY;
  const feedChannelId = env.KNOCK_FEED_CHANNEL_ID;
  if (userId === null || !publicKey || !feedChannelId) return null;

  const userToken = await knockUserToken(userId, env);
  if (!userToken) return null;

  return { publicKey, feedChannelId, userId: String(userId), userToken };
}

/** A fresh 1h RS256 Knock user token, or null if it can't be signed. */
export async function knockUserToken(
  userId: number,
  env: Env = process.env
): Promise<string | null> {
  const signingKey = env.KNOCK_SIGNING_KEY;
  if (!signingKey) return null;
  try {
    return await signUserToken(String(userId), {
      signingKey,
      expiresInSeconds: TOKEN_TTL_SECONDS,
    });
  } catch (error) {
    console.error("Failed to sign Knock user token", error);
    return null;
  }
}
