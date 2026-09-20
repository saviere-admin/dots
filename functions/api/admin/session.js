import { json } from "../_utils.js";
import { verifyAdminSession } from "./_auth.js";

export async function onRequestGet(context) {
  const authenticated = await verifyAdminSession(
    context.request,
    context.env
  );

  if (!authenticated) {
    return json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return json({
    success: true,
    authenticated: true,
  });
}
