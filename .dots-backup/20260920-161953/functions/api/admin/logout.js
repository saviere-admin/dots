import { json } from "../_utils.js";
import { requireAdmin, clearSessionCookie } from "./_auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);

  // Logging out should remain idempotent.
  if (!auth.ok && auth.response.status !== 401) return auth.response;

  return json(
    { success: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
        "Cache-Control": "no-store"
      }
    }
  );
}
