import type { Route } from "./+types/api.knock-token";
import { getCurrentUserId } from "~/lib/session";
import { knockUserToken } from "~/lib/knock-client.server";

// Fresh Knock user token for the session user. The client's
// onUserTokenExpiring calls this before the current token's 1h expiry.
export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getCurrentUserId(request);
  if (userId === null) {
    return Response.json({ token: null }, { status: 401 });
  }
  const token = await knockUserToken(userId);
  return Response.json({ token }, { status: token ? 200 : 503 });
}
