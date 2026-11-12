import { data } from "react-router";
import type { Route } from "./+types/api.knock-token";
import { getCurrentUserId } from "~/lib/auth/session";
import { knockUserToken } from "~/lib/notifications/knock-client.server";

// Fresh Knock user token for the session user. The client's
// onUserTokenExpiring calls this before the current token's 1h expiry.
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (userId === null) {
    throw data("Not signed in", { status: 401 });
  }
  const token = await knockUserToken(userId);
  if (!token) {
    throw data("Notifications are unavailable", { status: 503 });
  }
  return Response.json({ token });
}
