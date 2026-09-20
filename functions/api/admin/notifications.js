import { json } from "../_utils.js";
import { requireAdmin } from "./_auth.js";
import {
  dotsEmail,
  dotsEmailText,
  textToHtml
} from "../_email.js";

const MAX_RECIPIENTS_PER_BATCH = 100;

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function safeHttpsUrl(value) {
  if (!value) return "";

  try {
    const url = new URL(value);

    if (url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

async function resendBatch(env, payload, idempotencyKey) {
  const response = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Resend rejected the email batch."
    );
  }

  return data;
}

export async function onRequestGet({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (auth) {
    return auth;
  }

  try {
    const { results } = await env.DB.prepare(`
      SELECT
        id,
        subject,
        message,
        sent_count,
        failed_count,
        created_at
      FROM notifications
      ORDER BY datetime(created_at) DESC, id DESC
      LIMIT 100
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
  } catch (error) {
    console.error("Notification history error:", error);

    return json({
      success: true,
      data: []
    });
  }
}

export async function onRequestPost({ request, env }) {
  const auth = await requireAdmin(request, env);

  if (auth) {
    return auth;
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return json(
      {
        error:
          "Email service is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL."
      },
      500
    );
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

  const subject = String(body.subject || "")
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 200);

  const message = String(body.message || "")
    .trim();

  const ctaText = String(body.ctaText || "")
    .trim()
    .slice(0, 100);

  const ctaUrl = safeHttpsUrl(
    String(body.ctaUrl || "").trim()
  );

  if (!subject) {
    return json(
      {
        error: "Please provide an email subject."
      },
      400
    );
  }

  if (!message) {
    return json(
      {
        error: "Please provide an email message."
      },
      400
    );
  }

  if (message.length > 200000) {
    return json(
      {
        error: "Please provide an email body under 200 KB."
      },
      400
    );
  }

  if (body.ctaUrl && !ctaUrl) {
    return json(
      {
        error: "CTA URL must be a valid HTTPS URL."
      },
      400
    );
  }

  /*
   * Only allow addresses that actually exist in the waitlist.
   * This prevents the admin endpoint from becoming an arbitrary
   * outbound email sender.
   */
  const { results: waitlistRows } = await env.DB.prepare(`
    SELECT email
    FROM waitlist
    WHERE email IS NOT NULL
    ORDER BY datetime(created_at) DESC
  `).all();

  const waitlistEmails = [
    ...new Set(
      (waitlistRows || [])
        .map(row => String(row.email || "").trim().toLowerCase())
        .filter(validEmail)
    )
  ];

  const waitlistSet = new Set(waitlistEmails);

  const requestedEmails = Array.isArray(body.selectedEmails)
    ? [
        ...new Set(
          body.selectedEmails
            .map(email => String(email).trim().toLowerCase())
            .filter(Boolean)
        )
      ]
    : [];

  let recipients;

  if (body.allRecipients === true) {
    recipients = waitlistEmails;
  } else {
    recipients = requestedEmails.filter(email =>
      waitlistSet.has(email)
    );
  }

  if (!recipients.length) {
    return json(
      {
        error: "No valid waitlist recipients were selected."
      },
      400
    );
  }

  const batches = [];

  for (
    let i = 0;
    i < recipients.length;
    i += MAX_RECIPIENTS_PER_BATCH
  ) {
    batches.push(
      recipients.slice(
        i,
        i + MAX_RECIPIENTS_PER_BATCH
      )
    );
  }

  const bodyHtml = textToHtml(message);

  let sentCount = 0;
  let failedCount = 0;

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];

    const payload = batch.map(email => {
      const unsubscribeUrl =
        `https://usedots.in/api/unsubscribe?email=${encodeURIComponent(email)}`;

      const brandedHtml = dotsEmail({
        subject,
        preheader: subject,
        greeting: "",
        bodyHtml,
        unsubscribeUrl,
        ctaText,
        ctaUrl
      });

      const brandedText = dotsEmailText({
        subject,
        body: message,
        unsubscribeUrl,
        ctaText,
        ctaUrl
      });

      return {
        from: `dots. <${env.RESEND_FROM_EMAIL}>`,
        to: [email],
        subject,
        html: brandedHtml,
        text: brandedText,
        tags: [
          {
            name: "product",
            value: "dots"
          },
          {
            name: "category",
            value: "admin-broadcast"
          }
        ]
      };
    });

    try {
      await resendBatch(
        env,
        payload,
        `dots-broadcast-${Date.now()}-${batchIndex}`
      );

      sentCount += batch.length;
    } catch (error) {
      console.error(
        `Broadcast batch ${batchIndex + 1} failed:`,
        error
      );

      failedCount += batch.length;
    }
  }

  /*
   * Record the broadcast when the notifications table exists.
   * Email delivery itself should not fail just because history
   * storage is unavailable.
   */
  try {
    await env.DB.prepare(`
      INSERT INTO notifications
        (
          subject,
          message,
          sent_count,
          failed_count,
          created_at
        )
      VALUES (?, ?, ?, ?, ?)
    `)
      .bind(
        subject,
        message,
        sentCount,
        failedCount,
        new Date().toISOString()
      )
      .run();
  } catch (error) {
    console.error(
      "Could not record notification history:",
      error
    );
  }

  return json({
    success: failedCount === 0,
    sentCount,
    failedCount,
    recipientCount: recipients.length,
    batchCount: batches.length
  });
}