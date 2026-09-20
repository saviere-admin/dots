const SESSION_COOKIE = "dots_admin";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function base64UrlEncode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(
    Uint8Array.from(binary, char => char.charCodeAt(0))
  );
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/")
    + "=".repeat((4 - value.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sha256(value) {
  return crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
}

async function hmacSign(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

async function hmacVerify(value, signature, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signature),
    new TextEncoder().encode(value)
  );
}

function parseCookies(request) {
  const header = request.headers.get("Cookie") || "";
  const cookies = {};

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;

    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    cookies[name] = value;
  }

  return cookies;
}

function timingSafeEqual(a, b) {
  if (a.byteLength !== b.byteLength) return false;

  const left = new Uint8Array(a);
  const right = new Uint8Array(b);

  let difference = 0;

  for (let i = 0; i < left.length; i++) {
    difference |= left[i] ^ right[i];
  }

  return difference === 0;
}

export async function verifyAdminPassword(password, env) {
  if (!env.ADMIN_PASSWORD) return false;
  if (!password) return false;

  const expected = new Uint8Array(await sha256(env.ADMIN_PASSWORD));
  const supplied = new Uint8Array(await sha256(password));

  return timingSafeEqual(expected, supplied);
}

export async function verifyGithubPat(githubToken, env) {
  if (!githubToken || !env.ADMIN_GITHUB_USERNAME) {
    return false;
  }

  try {
    const response = await fetch(
      "https://" + "api.github.com/user",
      {
        method: "GET",
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${githubToken}`,
          "X-GitHub-Api-Version": "2026-03-10",
          "User-Agent": "dots-admin"
        }
      }
    );

    if (!response.ok) return false;

    const user = await response.json();
    const actualLogin = String(user.login || "").trim().toLowerCase();
    const allowedLogin = String(env.ADMIN_GITHUB_USERNAME || "")
      .trim()
      .toLowerCase();

    return Boolean(actualLogin && allowedLogin && actualLogin === allowedLogin);
  } catch {
    return false;
  }
}

export async function createAdminSession(env, githubLogin) {
  if (!env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }

  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;

  const payload = base64UrlEncode(
    JSON.stringify({
      login: githubLogin,
      exp: expiresAt
    })
  );

  const signature = await hmacSign(payload, env.ADMIN_PASSWORD);

  return `${payload}.${signature}`;
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`
  ].join("; ");
}

export async function verifyAdminSession(request, env) {
  if (!env.ADMIN_PASSWORD) return false;

  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];

  if (!token) return false;

  const separator = token.lastIndexOf(".");
  if (separator === -1) return false;

  const payload = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  if (!payload || !signature) return false;

  try {
    const validSignature = await hmacVerify(
      payload,
      signature,
      env.ADMIN_PASSWORD
    );

    if (!validSignature) return false;

    const data = JSON.parse(base64UrlDecode(payload));

    if (!data?.exp || Number(data.exp) <= Math.floor(Date.now() / 1000)) {
      return false;
    }

    if (
      !data.login ||
      String(data.login).toLowerCase() !==
        String(env.ADMIN_GITHUB_USERNAME || "").toLowerCase()
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function requireAdmin(request, env) {
  const authenticated = await verifyAdminSession(request, env);

  if (!authenticated) {
    return new Response(
      JSON.stringify({
        authenticated: false,
        error: "Unauthorized"
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        }
      }
    );
  }

  return { authenticated: true };
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}
