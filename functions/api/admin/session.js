import { json } from "../_utils.js";
import { verifyAdminSession } from "./_auth.js";

export async function onRequestGet({
  request,
  env
}) {
  const session =
    await verifyAdminSession(
      request,
      env
    );

  if (!session) {
    return json(
      {
        authenticated: false
      },
      401
    );
  }

  return json({
    authenticated: true,
    githubLogin:
      session.githubLogin
  });
}
