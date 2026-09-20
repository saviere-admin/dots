import { json } from "../_utils.js";
import { makeSessionCookie, clearSessionCookie, verifyGithubToken } from "./_auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_SECRET || !env.GITHUB_ADMIN_USERNAME) {
      return json({ error: "Admin authentication is not configured." }, { status: 500 });
    }

    const body = await request.json();
    const password = String(body.password || "");
    const githubToken = String(body.githubToken || "").trim();

    if (!password || !githubToken) {
      return json({ error: "Password and GitHub token are required." }, { status: 400 });
    }

    if (password !== env.ADMIN_PASSWORD) {
      return json({ error: "Invalid admin password." }, { status: 401 });
    }

    if (githubToken.length < 20 || githubToken.length > 500) {
      return json({ error: "Invalid GitHub token format." }, { status: 401 });
    }

    const github = await verifyGithubToken(githubToken, env.GITHUB_ADMIN_USERNAME);

    if (!github.ok) {
      return json({ error: github.reason }, { status: 401 });
    }

    return json(
      {
        success: true,
        user: github.login,
        expiresIn: 8 * 60 * 60
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": await makeSessionCookie(env, github.login),
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("Admin authentication error:", error);
    return json({ error: "Unable to authenticate." }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  return json(
    { success: true },
    {
      status: 200,
      headers: {
        "Set-Cookie": clearSessionCookie(),
        "Cache-Control": "no-store"
      }
    }
  );
}
