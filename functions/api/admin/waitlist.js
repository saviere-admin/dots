import { json } from "../../_utils.js";
import { requireAdmin } from "./_auth.js";

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const { results } = await env.DB.prepare(`
      SELECT id, full_name, email, phone, category, interest, notes, created_at
      FROM waitlist
      ORDER BY datetime(created_at) DESC, id DESC
    `).all();

    return json(
      { success: true, data: results || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Waitlist read error:", error);
    return json({ error: "Unable to load the waitlist." }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();

    if (!email) {
      return json({ error: "Email is required." }, { status: 400 });
    }

    const result = await env.DB.prepare(
      "DELETE FROM waitlist WHERE email = ?"
    ).bind(email).run();

    return json({ success: true, deleted: result.meta?.changes || 0 });
  } catch (error) {
    console.error("Waitlist delete error:", error);
    return json({ error: "Unable to remove the contact." }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const format = body.format === "csv" ? "csv" : "json";

    const { results } = await env.DB.prepare(`
      SELECT id, full_name, email, phone, category, interest, notes, created_at
      FROM waitlist
      ORDER BY datetime(created_at) DESC, id DESC
    `).all();

    if (format === "json") {
      return json({ success: true, data: results || [] });
    }

    const headers = [
      "id", "full_name", "email", "phone",
      "category", "interest", "notes", "created_at"
    ];

    const csv = [
      headers.join(","),
      ...(results || []).map(row =>
        headers.map(key => csvEscape(row[key])).join(",")
      )
    ].join("\r\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="dots-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    console.error("Waitlist export error:", error);
    return json({ error: "Unable to export the waitlist." }, { status: 500 });
  }
}
