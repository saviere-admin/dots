import { json } from "../_utils.js";
import { verifyAdminSession } from "./_auth.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  const pathname = new URL(request.url).pathname;

  // Login must remain reachable without an existing session.
  if (pathname === "/api/admin/login") {
    return next();
  }

  const authenticated = await verifyAdminSession(request, env);

  if (!authenticated) {
    return json(
      {
        error: "Unauthorized",
        code: "ADMIN_AUTH_REQUIRED",
      },
      {
        status: 401,
        headers: {
          "WWW-Authenticate": 'Cookie realm="dots-admin"',
        },
      }
    );
  }

  return next();
}
