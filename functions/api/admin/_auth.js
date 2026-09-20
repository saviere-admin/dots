const SESSION_COOKIE = "dots_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function base64UrlEncode(value) {
  const bytes =
    typeof value === "string"
      ? new TextEncoder().encode(value)
      : value;

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    normalized +
    "=".repeat(
      (4 - normalized.length % 4) % 4
    );

  const binary = atob(padded);

  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new TextDecoder().decode(bytes);
}

async function hmacSign(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256"
    },
    false,
    ["sign"]
  );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value)
    );

  return base64UrlEncode(
    new Uint8Array(signature)
  );
}

async function hmacVerify(
  secret,
  value,
  signature
) {
  const expected =
    await hmacSign(secret, value);

  if (expected.length !== signature.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < expected.length; i++) {
    result |=
      expected.charCodeAt(i) ^
      signature.charCodeAt(i);
  }

  return result === 0;
}

function parseCookies(request) {
  const header =
    request.headers.get("Cookie") || "";

  const cookies = {};

  for (const part of header.split(";")) {
    const [name, ...rest] =
      part.trim().split("=");

    if (!name) continue;

    cookies[name] =
      rest.join("=");
  }

  return cookies;
}

function getSessionSecret(env) {
  /*
   * No separate session secret.
   * Changing ADMIN_PASSWORD automatically invalidates
   * existing admin sessions.
   */
  return env.ADMIN_PASSWORD || "";
}

export async function verifyAdminPassword(
  password,
  env
) {
  const expected =
    String(env.ADMIN_PASSWORD || "");

  const supplied =
    String(password || "");

  if (!expected || !supplied) {
    return false;
  }

  /*
   * Hash both values before comparison.
   */
  const encoder = new TextEncoder();

  const [expectedHash, suppliedHash] =
    await Promise.all([
      crypto.subtle.digest(
        "SHA-256",
        encoder.encode(expected)
      ),
      crypto.subtle.digest(
        "SHA-256",
        encoder.encode(supplied)
      )
    ]);

  const a = new Uint8Array(expectedHash);
  const b = new Uint8Array(suppliedHash);

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

export async function verifyGithubPat(
  githubToken,
  env
) {
  const token =
    String(githubToken || "").trim();

  const allowedUsername =
    String(
      env.ADMIN_GITHUB_USERNAME || ""
    )
      .trim()
      .toLowerCase();

  if (!token || !allowedUsername) {
    return {
      valid: false,
      reason: "github-not-configured"
    };
  }

  try {
    const response = await fetch(
      "https://api.github.com/user",
      {
        method: "GET",
        headers: {
          Accept:
            "application/vnd.github+json",
          Authorization:
            `Bearer ${token}`,
          "X-GitHub-Api-Version":
            "2026-03-10",
          "User-Agent":
            "dots-admin"
        }
      }
    );

    if (!response.ok) {
      return {
        valid: false,
        reason: "github-token-invalid"
      };
    }

    const user =
      await response.json();

    const login =
      String(user.login || "")
        .trim()
        .toLowerCase();

    if (login !== allowedUsername) {
      return {
        valid: false,
        reason: "github-user-not-authorized"
      };
    }

    return {
      valid: true,
      login: user.login
    };
  } catch (error) {
    console.error(
      "GitHub authentication error:",
      error
    );

    return {
      valid: false,
      reason: "github-unavailable"
    };
  }
}

export async function createAdminSession(
  env,
  githubLogin
) {
  const secret =
    getSessionSecret(env);

  if (!secret) {
    throw new Error(
      "ADMIN_PASSWORD is not configured."
    );
  }

  const expiresAt =
    Math.floor(Date.now() / 1000) +
    SESSION_TTL_SECONDS;

  const payload =
    `${githubLogin}.${expiresAt}`;

  const encoded =
    base64UrlEncode(payload);

  const signature =
    await hmacSign(
      secret,
      encoded
    );

  return `${encoded}.${signature}`;
}

export function sessionCookie(
  token,
  maxAge = SESSION_TTL_SECONDS
) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAge}`
  ].join("; ");
}

export async function verifyAdminSession(
  request,
  env
) {
  const secret =
    getSessionSecret(env);

  if (!secret) {
    return false;
  }

  const cookies =
    parseCookies(request);

  const token =
    cookies[SESSION_COOKIE];

  if (!token) {
    return false;
  }

  const parts =
    token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [encoded, signature] =
    parts;

  const validSignature =
    await hmacVerify(
      secret,
      encoded,
      signature
    );

  if (!validSignature) {
    return false;
  }

  try {
    const payload =
      base64UrlDecode(encoded);

    const [githubLogin, expiresAt] =
      payload.split(".");

    if (!githubLogin || !expiresAt) {
      return false;
    }

    const expiry =
      Number(expiresAt);

    if (
      !Number.isFinite(expiry) ||
      expiry <=
        Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    return {
      authenticated: true,
      githubLogin
    };
  } catch {
    return false;
  }
}

export async function requireAdmin(
  request,
  env
) {
  const authenticated =
    await verifyAdminSession(
      request,
      env
    );

  if (!authenticated) {
    return new Response(
      JSON.stringify({
        error: "Unauthorized"
      }),
      {
        status: 401,
        headers: {
          "Content-Type":
            "application/json; charset=utf-8",
          "Cache-Control":
            "no-store"
        }
      }
    );
  }

  return null;
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}
