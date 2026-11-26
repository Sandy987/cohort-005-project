import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;

export type AnalyticsViewer = { userId: number; isAdmin: boolean };

// "course" is the second tab; anything else falls back to the overview.
export type AnalyticsTab = "overview" | "course";

export type RevenueSummary = {
  grossCents: number;
  feeCents: number;
  netCents: number;
  purchaseCount: number;
};
