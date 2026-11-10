// PROTOTYPE — throwaway. Loads .env (dev doesn't today) and exposes Knock config.
import Knock from "@knocklabs/node";

try {
  process.loadEnvFile(".env");
} catch {}

export const knockPublic = {
  apiKey: process.env.KNOCK_PUBLIC_API_KEY ?? null,
  feedId: process.env.KNOCK_FEED_CHANNEL_ID ?? null,
};

export const knock = new Knock({ apiKey: process.env.KNOCK_SECRET_API_KEY });
