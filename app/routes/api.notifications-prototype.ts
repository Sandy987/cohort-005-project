// PROTOTYPE — throwaway. Fires the `test-notification` workflow at the current user (variant D).
import type { Route } from "./+types/api.notifications-prototype";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { users } from "~/db/schema";
import { getCurrentUserId } from "~/lib/session";
import { knock } from "~/lib/knock-prototype.server";

const SAMPLES = [
  "Priya Patel replied to your comment",
  "Your Refund Request for “React Patterns” was approved",
  "Jordan Kim opened a Refund Request for “Node.js Deep Dive”",
];
let i = 0;

export async function action({ request }: Route.ActionArgs) {
  const userId = await getCurrentUserId(request);
  if (!userId) return Response.json({ error: "no user" }, { status: 401 });
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  const message = SAMPLES[i++ % SAMPLES.length];
  const run = await knock.workflows.trigger("test-notification", {
    recipients: [{ id: String(userId), name: user?.name, email: user?.email }],
    data: { message, body: message, url: "/courses" },
  });
  return Response.json(run);
}
