import { json, requireSameOrigin } from "../_utils.js";
import { clearSessionCookie } from "./_auth.js";

export async function onRequestPost(context) {
  const { request } = context;

  if (!requireSameOrigin(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  return json(
    { success: true },
    {
      headers: {
        "Set-Cookie": clearSessionCookie(),
      },
    }
  );
}
