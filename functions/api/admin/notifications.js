import { chunk, json, requireSameOrigin } from "../_utils.js";

const MAX_BATCH = 100;
const MAX_RECIPIENTS_PER_MESSAGE = 1;
const MAX_SUBJECT_LENGTH = 180;
const MAX_HTML_LENGTH = 250_000;

function normalizeRecipients(value) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((email) => String(email || "").trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email))
    ),
  ];
}

async function sendBatch(env, messages) {
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const raw = await response.text();

  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Resend returned HTTP ${response.status}.`
    );
  }

  return data;
}

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const { results } = await env.DB.prepare(
      `SELECT
        id,
        subject,
        message,
        sent_count,
        failed_count,
        created_at
       FROM notifications
       ORDER BY datetime(created_at) DESC, id DESC
       LIMIT 100`
    ).all();

    return json({
      success: true,
      data: results || [],
    });
  } catch (error) {
    console.error("Notification history error:", error);

    return json(
      { error: "Unable to load notification history." },
      { status: 500 }
    );
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!requireSameOrigin(request)) {
    return json({ error: "Invalid request origin." }, { status: 403 });
  }

  try {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
      return json(
        { error: "Resend is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => null);

    const subject = String(body?.subject || "").trim();
    const html = String(body?.html || "").trim();
    const recipients = normalizeRecipients(body?.selectedEmails);

    if (!subject || subject.length > MAX_SUBJECT_LENGTH) {
      return json(
        { error: "Enter a valid subject." },
        { status: 400 }
      );
    }

    if (!html || html.length > MAX_HTML_LENGTH) {
      return json(
        { error: "Enter a valid email body." },
        { status: 400 }
      );
    }

    if (!recipients.length) {
      return json(
        { error: "No valid recipients were selected." },
        { status: 400 }
      );
    }

    const batches = chunk(recipients, MAX_BATCH);
    let sentCount = 0;
    let failedCount = 0;
    const errors = [];

    for (const batch of batches) {
      const messages = batch.map((email) => ({
        from: `dots. <${env.RESEND_FROM_EMAIL}>`,
        to: [email].slice(0, MAX_RECIPIENTS_PER_MESSAGE),
        subject,
        html,
      }));

      try {
        await sendBatch(env, messages);
        sentCount += batch.length;
      } catch (error) {
        console.error("Resend batch failed:", error);
        failedCount += batch.length;
        errors.push(error.message);
      }
    }

    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO notifications
        (subject, message, sent_count, failed_count, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(subject, html, sentCount, failedCount, createdAt)
      .run();

    if (sentCount === 0) {
      return json(
        {
          error: errors[0] || "No messages were sent.",
          sentCount,
          failedCount,
        },
        { status: 502 }
      );
    }

    return json({
      success: true,
      count: sentCount,
      sentCount,
      failedCount,
      warning:
        failedCount > 0
          ? `${failedCount} recipient(s) could not be sent.`
          : null,
    });
  } catch (error) {
    console.error("Notification send error:", error);

    return json(
      { error: "Unable to send the notification." },
      { status: 500 }
    );
  }
}
