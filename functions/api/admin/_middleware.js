import { json } from "../_utils.js";
import { verifyAdminSession } from "./_auth.js";

export async function onRequest(
  context
) {
  const {
    request,
    next,
    env
  } = context;

  const pathname =
    new URL(request.url).pathname;

  if (
    pathname ===
    "/api/admin/login"
  ) {
    return next();
  }

  const session =
    await verifyAdminSession(
      request,
      env
    );

  if (!session) {
    return json(
      {
        error: "Unauthorized"
      },
      401
    );
  }

  return next();
}
