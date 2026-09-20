import { json } from "../_utils.js";
import { requireAdmin, clearSessionCookie } from "./_auth.js";

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Set-Cookie": clearSessionCookie()
      }
    }
  );
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
