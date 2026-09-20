export function json(
  data,
  status = 200,
  headers = {}
) {
  /*
   * Support both:
   *
   * json(data, 400)
   *
   * and:
   *
   * json(data, {
   *   status: 400,
   *   headers: {}
   * })
   */
  if (
    typeof status === "object" &&
    status !== null
  ) {
    headers = status.headers || {};
    status = status.status ?? 200;
  }

  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...headers
      }
    }
  );
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    String(email || "")
  );
}

export function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function requireSameOrigin(request) {
  const origin = request.headers.get("Origin");

  if (!origin) {
    return true;
  }

  try {
    const requestOrigin =
      new URL(request.url).origin;

    return origin === requestOrigin;
  } catch {
    return false;
  }
}