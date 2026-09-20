import { json } from "../_utils.js";
import { verifyAdminSession } from "./_auth.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const pathname = new URL(request.url).pathname;

  if (pathname === "/api/admin/login") {
    return next();
  }

  const authenticated = await verifyAdminSession(request, env);

  if (!authenticated) {
    return json(
      {
        authenticated: false,
        error: "Unauthorized"
      },
      {
        status: 401,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }

  return next();
}
