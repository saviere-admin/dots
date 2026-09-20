import { json } from "../_utils.js";
import { requireAdmin } from "./_auth.js";

const MAX_RECIPIENTS_PER_BATCH = 100;


async function resendBatch(env, emails, idempotencyKey) {
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(emails)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Resend batch request failed.");
  }

  return data;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const { results } = await env.DB.prepare(`
      SELECT id, subject, message, sent_count, failed_count, created_at
      FROM notifications
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 50
    `).all();

    return json(
      { success: true, data: results || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Notification history error:", error);
    return json({ error: "Unable to load notification history." }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await requireAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      return json({ error: "Resend is not configured." }, { status: 500 });
    }

    const body = await request.json();

    const subject = String(body.subject || "").trim();
    const html = String(body.html || "").trim();
    const selectedEmails = Array.isArray(body.selectedEmails)
      ? [...new Set(body.selectedEmails.map(email => String(email).trim().toLowerCase()).filter(Boolean))]
      : [];

    if (!subject || subject.length > 200) {
      return json({ error: "Please provide a subject under 200 characters." }, { status: 400 });
    }

    if (!html || html.length > 200_000) {
      return json({ error: "Please provide an email body under 200 KB." }, { status: 400 });
    }

    if (!selectedEmails.length) {
      return json({ error: "No recipients selected." }, { status: 400 });
    }

    if (selectedEmails.some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return json({ error: "One or more recipient email addresses are invalid." }, { status: 400 });
    }

    const timestamp = new Date().toISOString();
    const batches = [];

    for (let i = 0; i < selectedEmails.length; i += MAX_RECIPIENTS_PER_BATCH) {
      batches.push(selectedEmails.slice(i, i + MAX_RECIPIENTS_PER_BATCH));
    }

    let sentCount = 0;
    let failedCount = 0;

    for (let index = 0; index < batches.length; index++) {
      const batch = batches[index];

      const payload = batch.map(email => ({
        from: `dots. <${env.RESEND_FROM_EMAIL}>`,
        to: [email],
        subject,
        html,
        tags: [
          { name: "product", value: "dots" },
          { name: "category", value: "admin-broadcast" }
        ]
      }));

      try {
        await resendBatch(
          env,
          payload,
          `dots-broadcast-${Date.now()}-${index}-${batch.length}`
        );
        sentCount += batch.length;
      } catch (error) {
        failedCount += batch.length;
        console.error(`Broadcast batch ${index + 1} failed:`, error);
      }
    }

    await env.DB.prepare(`
      INSERT INTO notifications
        (subject, message, sent_count, failed_count, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      subject,
      html,
      sentCount,
      failedCount,
      timestamp
    ).run();

    if (sentCount === 0) {
      return json(
        { error: "Resend could not deliver any of the selected messages." },
        { status: 502 }
      );
    }

    return json({
      success: true,
      count: sentCount,
      failed: failedCount,
      batches: batches.length
    });
  } catch (error) {
    console.error("Notification send error:", error);
    return json({ error: error.message || "Unable to send notification." }, { status: 500 });
  }
}
