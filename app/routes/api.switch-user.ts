import { redirect } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/api.switch-user";
import { setCurrentUserId } from "~/lib/auth/session";
import { parseFormData } from "~/lib/shared/validation";

const switchUserSchema = z.object({
  userId: z.coerce.number().int().positive("Invalid user ID"),
});

export async function action({ request, url }: Route.ActionArgs) {
  const formData = await request.formData();
  const parsed = parseFormData(formData, switchUserSchema);

  if (!parsed.success) {
    throw new Response("Invalid user ID", { status: 400 });
  }

  const cookie = await setCurrentUserId(request, parsed.data.userId);

  return redirect(url.searchParams.get("redirectTo") ?? "/", {
    headers: { "Set-Cookie": cookie },
  });
}
