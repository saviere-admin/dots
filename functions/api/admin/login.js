import { json, requireSameOrigin } from "../_utils.js";
import {
  createAdminSession,
  sessionCookie,
  verifyAdminPassword,
  verifyGithubPat
} from "./_auth.js";

export async function onRequestPost({ request, env }) {
  try {
    requireSameOrigin(request);

    const body = await request.json();

    const password = String(body.password || "");
    const githubToken = String(body.githubToken || "").trim();

    if (!password || !githubToken) {
      return json(
        { error: "Admin password and GitHub personal access token are required." },
        { status: 400 }
      );
    }

    const passwordValid = await verifyAdminPassword(password, env);

    if (!passwordValid) {
      return json(
        { error: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    const githubValid = await verifyGithubPat(githubToken, env);

    if (!githubValid) {
      return json(
        { error: "Invalid admin credentials." },
        { status: 401 }
      );
    }

    const githubLogin = String(env.ADMIN_GITHUB_USERNAME).trim();

    const token = await createAdminSession(env, githubLogin);

    return json(
      {
        success: true,
        authenticated: true
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": sessionCookie(token),
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("Admin login error:", error);

    return json(
      { error: "Unable to sign in right now." },
      { status: 500 }
    );
  }
}
