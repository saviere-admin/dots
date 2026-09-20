import { json } from "../_utils.js";
import { requireAdmin } from "./_auth.js";

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

  return json(
    {
      success: true,
      data: results || []
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function onRequestDelete({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (auth) {
    return auth;
  }

  let body;

  try {
    body = await request.json();
  } catch {
    return json(
      {
        error: "Invalid JSON request."
      },
      400
    );
  }

  const email = String(body.email || "")
    .trim()
    .toLowerCase();

  if (!email) {
    return json(
      {
        error: "Email is required."
      },
      400
    );
  }

  const result = await env.DB.prepare(`
    DELETE FROM waitlist
    WHERE lower(email) = lower(?)
  `)
    .bind(email)
    .run();

  return json({
    success: true,
    deleted: result.meta?.changes || 0
  });
}