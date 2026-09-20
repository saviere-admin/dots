import {
  json,
  requireSameOrigin
} from "../_utils.js";

import {
  verifyAdminPassword,
  verifyGithubPat,
  createAdminSession,
  sessionCookie
} from "./_auth.js";

export async function onRequestPost({
  request,
  env
}) {
  if (!requireSameOrigin(request)) {
    return json(
      {
        error: "Forbidden."
      },
      403
    );
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: "Invalid request."
      },
      400
    );
  }

  const password =
    String(body.password || "");

  const githubToken =
    String(body.githubToken || "").trim();

  if (!password || !githubToken) {
    return json(
      {
        error:
          "Admin password and GitHub PAT are both required."
      },
      400
    );
  }

  const passwordValid =
    await verifyAdminPassword(
      password,
      env
    );

  if (!passwordValid) {
    return json(
      {
        error:
          "Invalid admin credentials."
      },
      401
    );
  }

  const githubAuth =
    await verifyGithubPat(
      githubToken,
      env
    );

  /*
   * Deliberately do not expose whether the
   * password or GitHub credential failed.
   */
  if (!githubAuth.valid) {
    return json(
      {
        error:
          "Invalid admin credentials."
      },
      401
    );
  }

  const token =
    await createAdminSession(
      env,
      githubAuth.login
    );

  return new Response(
    JSON.stringify({
      success: true,
      authenticated: true,
      githubLogin: githubAuth.login
    }),
    {
      status: 200,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",
        "Cache-Control":
          "no-store",
        "Set-Cookie":
          sessionCookie(token)
      }
    }
  );
}
