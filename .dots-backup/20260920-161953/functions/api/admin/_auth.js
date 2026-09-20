const encoder = new TextEncoder();

function base64UrlEncode(bytes) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function createSession(env, username) {
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000;
  const nonce = base64UrlEncode(crypto.getRandomValues(new Uint8Array(18)));
  const payload = `${username}|${expiresAt}|${nonce}`;
  const signature = base64UrlEncode(await hmac(env.ADMIN_SESSION_SECRET, payload));
  return {
    value: `${base64UrlEncode(encoder.encode(payload))}.${signature}`,
    expiresAt
  };
}

async function verifySession(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(/(?:^|;\s*)dots_admin_session=([^;]+)/);
  if (!match) return null;

  const [encodedPayload, signature] = match[1].split(".");
  if (!encodedPayload || !signature) return null;

  try {
    const payload = new TextDecoder().decode(base64UrlDecode(encodedPayload));
    const expected = base64UrlEncode(await hmac(env.ADMIN_SESSION_SECRET, payload));

    if (!constantTimeEqual(signature, expected)) return null;

    const [username, expiresAt] = payload.split("|");
    if (!username || !expiresAt || Number(expiresAt) < Date.now()) return null;

    if (username !== env.GITHUB_ADMIN_USERNAME) return null;

    return { username, expiresAt: Number(expiresAt) };
  } catch {
    return null;
  }
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;

  const url = new URL(request.url);
  return origin === url.origin;
}

export async function requireAdmin(request, env) {
  if (!env.ADMIN_SESSION_SECRET) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Admin session secret is not configured." }),
        { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      )
    };
  }

  if (!sameOrigin(request)) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Cross-origin request blocked." }),
        { status: 403, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      )
    };
  }

  const session = await verifySession(request, env);

  if (!session) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: "Authentication required." }),
        { status: 401, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
      )
    };
  }

  return { ok: true, session };
}

export async function verifyGithubToken(token, expectedUsername) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "dots-admin",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    return { ok: false, reason: "GitHub token was rejected." };
  }

  const user = await response.json();

  if (!user?.login || user.login.toLowerCase() !== String(expectedUsername || "").toLowerCase()) {
    return { ok: false, reason: "This GitHub account is not authorized." };
  }

  return { ok: true, login: user.login };
}

export async function makeSessionCookie(env, username) {
  const { value } = await createSession(env, username);

  return [
    `dots_admin_session=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=28800"
  ].join("; ");
}

export function clearSessionCookie() {
  return [
    "dots_admin_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0"
  ].join("; ");
}
