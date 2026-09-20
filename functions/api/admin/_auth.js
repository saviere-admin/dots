const SESSION_COOKIE = "dots_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64urlEncode(value) {
  return base64url(new TextEncoder().encode(value));
}

function base64urlDecode(value) {
  const padded = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(value.length / 4) * 4, "=");

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

async function getHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(secret, value) {
  const key = await getHmacKey(secret);

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return base64url(new Uint8Array(signature));
}

async function verifySignature(secret, value, signature) {
  const key = await getHmacKey(secret);

  const padded = signature
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(signature.length / 4) * 4, "=");

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(value)
  );
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;

  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

function getCookie(request) {
  const header = request.headers.get("Cookie") || "";

  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");

    if (name === SESSION_COOKIE) {
      return rest.join("=");
    }
  }

  return null;
}

export async function verifyAdminPassword(password, env) {
  if (!env.ADMIN_PASSWORD || typeof password !== "string") {
    return false;
  }

  return constantTimeEqual(password, env.ADMIN_PASSWORD);
}

export async function createAdminSession(env) {
  if (!env.ADMIN_SESSION_SECRET) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    iat: now,
    exp: now + SESSION_TTL_SECONDS
  };

  const encoded = base64urlEncode(JSON.stringify(payload));
  const signature = await sign(
    env.ADMIN_SESSION_SECRET,
    encoded
  );

  return `${encoded}.${signature}`;
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    `Max-Age=${maxAge}`
  ].join("; ");
}

export async function verifyAdminSession(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return false;

  const token = getCookie(request);

  if (!token) return false;

  const separator = token.lastIndexOf(".");

  if (separator <= 0) return false;

  const encoded = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  try {
    const valid = await verifySignature(
      env.ADMIN_SESSION_SECRET,
      encoded,
      signature
    );

    if (!valid) return false;

    const payload = JSON.parse(
      base64urlDecode(encoded)
    );

    return Boolean(
      payload &&
      typeof payload.exp === "number" &&
      payload.exp > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export { SESSION_COOKIE };

export async function requireAdmin(request, env) {
  const authenticated = await verifyAdminSession(request, env);

  if (authenticated) {
    return { ok: true };
  }

  return {
    ok: false,
    response: new Response(
      JSON.stringify({ error: "Unauthorized" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    )
  };
}

export function clearSessionCookie() {
  return sessionCookie("", 0);
}
