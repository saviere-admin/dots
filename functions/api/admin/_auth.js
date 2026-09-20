const SESSION_COOKIE = "dots_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function base64UrlEncode(value) {
  const bytes =
    value instanceof Uint8Array
      ? value
      : new TextEncoder().encode(String(value));

  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = String(value)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  return new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(value)
    )
  );
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }

  return result === 0;
}

function parseCookies(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = {};

  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;

    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();

    if (key) cookies[key] = value;
  }

  return cookies;
}

export async function verifyAdminPassword(password, env) {
  if (!env.ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }

  const supplied = new TextEncoder().encode(String(password || ""));
  const expected = new TextEncoder().encode(env.ADMIN_PASSWORD);

  // Hash both values so the comparison always operates on fixed-length data.
  const [suppliedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", supplied),
    crypto.subtle.digest("SHA-256", expected),
  ]);

  return constantTimeEqual(
    new Uint8Array(suppliedHash),
    new Uint8Array(expectedHash)
  );
}

export async function createAdminSession(env) {
  if (!env.ADMIN_SESSION_SECRET) {
    throw new Error("ADMIN_SESSION_SECRET is not configured.");
  }

  const payload = {
    sub: "admin",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(
    await hmac(env.ADMIN_SESSION_SECRET, encodedPayload)
  );

  return `${encodedPayload}.${signature}`;
}

export async function verifyAdminSession(request, env) {
  if (!env.ADMIN_SESSION_SECRET) return false;

  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];

  if (!token) return false;

  const [encodedPayload, encodedSignature] = token.split(".");
  if (!encodedPayload || !encodedSignature) return false;

  try {
    const expectedSignature = await hmac(
      env.ADMIN_SESSION_SECRET,
      encodedPayload
    );

    const suppliedSignature = base64UrlDecode(encodedSignature);

    if (!constantTimeEqual(expectedSignature, suppliedSignature)) {
      return false;
    }

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlDecode(encodedPayload))
    );

    if (
      payload?.sub !== "admin" ||
      !Number.isFinite(payload?.exp) ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function sessionCookie(token, secure = true) {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${SESSION_TTL_SECONDS}`,
    secure ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");
}

export function clearSessionCookie() {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
    "Secure",
  ].join("; ");
}
