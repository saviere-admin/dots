import { json, isValidEmail } from "./_utils.js";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));
}

async function sendResendEmail(env, payload, idempotencyKey) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {})
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Resend rejected the email.");
  }

  return data;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    const name = String(body.name || "").trim().replace(/\s+/g, " ");
    const email = String(body.email || "").trim().toLowerCase();
    const honeypot = String(body.website || "").trim();

    // Quiet bot trap. A real browser never fills this field.
    if (honeypot) {
      return json({ success: true, message: "You're on the list." });
    }

    if (name.length < 2 || name.length > 100) {
      return json({ error: "Please enter your name." }, { status: 400 });
    }

    if (!isValidEmail(email) || email.length > 254) {
      return json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!env.DB) {
      return json({ error: "Waitlist database is not configured." }, { status: 500 });
    }

    const createdAt = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO waitlist (name, email, created_at)
      VALUES (?, ?, ?)
    `).bind(name, email, createdAt).run();

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);

    let confirmationSent = false;
    let adminNotificationSent = false;

    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      const baseTags = [{ name: "product", value: "dots" }];

      const [confirmationResult, adminResult] = await Promise.allSettled([
        sendResendEmail(
          env,
          {
            from: `dots. <${env.RESEND_FROM_EMAIL}>`,
            to: [email],
            subject: "You're on the dots. early access list",
            tags: [...baseTags, { name: "category", value: "waitlist-confirmation" }],
            html: `
              <!doctype html>
              <html>
                <body style="margin:0;background:#f7f7f5;font-family:Arial,sans-serif;color:#111">
                  <div style="max-width:600px;margin:0 auto;padding:48px 24px">
                    <div style="background:#fff;border:1px solid #e8e8e5;border-radius:28px;padding:40px">
                      <div style="font-size:28px;font-weight:800;letter-spacing:-1px">
                        dots<span style="color:#d0a84f">.</span>
                      </div>
                      <p style="margin:36px 0 8px;color:#777;font-size:13px;letter-spacing:.12em;text-transform:uppercase">
                        Early access
                      </p>
                      <h1 style="font-size:38px;line-height:1.05;letter-spacing:-1.5px;margin:0 0 20px">
                        You're on the list.
                      </h1>
                      <p style="font-size:17px;line-height:1.7;color:#555">
                        Hi ${safeName}, your place in the dots. early access list is confirmed.
                      </p>
                      <p style="font-size:17px;line-height:1.7;color:#555">
                        We'll email you when the next chapter is ready.
                      </p>
                      <div style="margin-top:32px;padding:18px 20px;background:#faf8f0;border-radius:16px;color:#6d5a2c;font-size:14px">
                        Your email: ${safeEmail}
                      </div>
                      <p style="margin:32px 0 0;color:#999;font-size:13px">
                        — dots.
                      </p>
                    </div>
                  </div>
                </body>
              </html>
            `
          },
          `waitlist-confirmation-${email}`
        ),
        env.EMAIL_TO
          ? sendResendEmail(
              env,
              {
                from: `dots. <${env.RESEND_FROM_EMAIL}>`,
                to: [env.EMAIL_TO],
                subject: `New dots. waitlist signup — ${name}`,
                tags: [...baseTags, { name: "category", value: "waitlist-admin-alert" }],
                html: `
                  <h2>New dots. waitlist signup</h2>
                  <p><strong>Name:</strong> ${safeName}</p>
                  <p><strong>Email:</strong> ${safeEmail}</p>
                  <p><strong>Joined:</strong> ${createdAt}</p>
                `
              },
              `waitlist-admin-alert-${createdAt}-${email}`
            )
          : Promise.resolve(null)
      ]);

      confirmationSent = confirmationResult.status === "fulfilled";
      adminNotificationSent = adminResult.status === "fulfilled" && Boolean(env.EMAIL_TO);

      if (confirmationResult.status === "rejected") {
        console.error("Waitlist confirmation email failed:", confirmationResult.reason);
      }

      if (adminResult.status === "rejected") {
        console.error("Waitlist admin notification failed:", adminResult.reason);
      }
    }

    return json({
      success: true,
      message: "You're officially on the dots. waitlist.",
      confirmationSent,
      adminNotificationSent
    });
  } catch (error) {
    console.error("Waitlist submission error:", error);

    if (/UNIQUE constraint failed/i.test(error.message || "")) {
      return json(
        { error: "This email is already on the waitlist." },
        { status: 409 }
      );
    }

    return json(
      { error: "We couldn't join you to the waitlist right now. Please try again." },
      { status: 500 }
    );
  }
}
