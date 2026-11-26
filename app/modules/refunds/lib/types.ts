import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import type * as schema from "~/db/schema";
import type { coupons, purchases } from "~/db/schema";

export type Db = BetterSQLite3Database<typeof schema>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type Queryable = Db | Tx;

export type Purchase = typeof purchases.$inferSelect;
export type Seat = typeof coupons.$inferSelect;

export type Failure = {
  ok: false;
  status: 400 | 403 | 404 | 409;
  error: string;
};

export type Email = { to: string; subject: string; body: string };
