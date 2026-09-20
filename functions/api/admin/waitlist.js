import { json, requireSameOrigin } from "../_utils.js";

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      `SELECT
        id,
        full_name,
        email,
        phone,
        category,
        interest,
        notes,
        created_at
       FROM waitlist
       ORDER BY datetime(created_at) DESC, id DESC`
    ).all();

    return json({
      success: true,
      data: results || [],
      count: results?.length || 0,
    });
  } catch (error) {
    console.error("Admin waitlist GET error:", error);

    return json(
      { error: "Unable to load the waitlist." },
      { status: 500 }
    );
  }
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  if (!requireSameOrigin(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => null);
    const email = String(body?.email || "").trim().toLowerCase();

    if (!email) {
      return json({ error: "Email is required." }, { status: 400 });
    }

    await env.DB.prepare(
      "DELETE FROM waitlist WHERE email = ?"
    ).bind(email).run();

    return json({ success: true });
  } catch (error) {
    console.error("Admin waitlist DELETE error:", error);

    return json(
      { error: "Unable to remove the contact." },
      { status: 500 }
    );
  }
}
