import { requireAdmin } from "./_auth.js";

function csvEscape(value) {
  const stringValue = String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n") ||
    stringValue.includes("\r")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (auth) {
    return auth;
  }

  const { results } = await env.DB.prepare(`
    SELECT
      id,
      name,
      email,
      source,
      created_at
    FROM waitlist
    ORDER BY datetime(created_at) DESC, id DESC
  `).all();

  const rows = [
    [
      "id",
      "name",
      "email",
      "source",
      "created_at"
    ],
    ...(results || []).map(row => [
      row.id,
      row.name,
      row.email,
      row.source,
      row.created_at
    ])
  ];

  const csv = rows
    .map(row => row.map(csvEscape).join(","))
    .join("\r\n");

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        `attachment; filename="dots-waitlist-${new Date()
          .toISOString()
          .slice(0, 10)}.csv"`,
      "Cache-Control": "no-store"
    }
  });
}