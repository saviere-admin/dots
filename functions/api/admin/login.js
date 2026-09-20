import { json, requireSameOrigin } from "../_utils.js";
import {
  createAdminSession,
  sessionCookie,
  verifyAdminPassword,
} from "./_auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!requireSameOrigin(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const password = String(body?.password || "");

    if (!password) {
      return json(
        { error: "Password is required." },
        { status: 400 }
      );
    }

    const valid = await verifyAdminPassword(password, env);

    if (!valid) {
      return json(
        { error: "Invalid admin password." },
        { status: 401 }
      );
    }

    const token = await createAdminSession(env);
    const secure = new URL(request.url).protocol === "https:";

    return json(
      {
        success: true,
        expiresIn: 8 * 60 * 60,
      },
      {
        headers: {
          "Set-Cookie": sessionCookie(token, secure),
        },
      }
    );
  } catch (error) {
    console.error("Admin login error:", error);

    return json(
      { error: "Authentication service is not configured correctly." },
      { status: 500 }
    );
  }
}

export async function onRequestGet(context) {
  return json({ error: "Method not allowed." }, { status: 405 });
}
