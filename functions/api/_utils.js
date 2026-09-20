export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function corsHeaders(request) {
  const origin = request?.headers?.get("Origin") || "";
  const allowed = [
    "https://usedots.in",
    "https://www.usedots.in"
  ];

  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : "https://usedots.in",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
  };
}

export function isValidEmail(email) {
  return typeof email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
