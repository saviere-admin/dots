import {
  escapeHtml,
  isValidEmail,
  json,
  normalizeEmail,
} from "./_utils.js";

async function sendResendEmail(env, payload) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  if (!env.RESEND_FROM_EMAIL) {
    throw new Error("RESEND_FROM_EMAIL is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return json({ error: "Invalid request body." }, { status: 400 });
    }

    // Honeypot: bots that fill this field are silently accepted without
    // touching the database or email provider.
    if (String(body.website || "").trim()) {
      return json({
        success: true,
        confirmationSent: false,
        adminNotificationSent: false,
      });
    }

    const fullName = String(body.name || "").trim().replace(/\s+/g, " ");
    const email = normalizeEmail(body.email);

    if (fullName.length < 2 || fullName.length > 120) {
      return json(
        { error: "Please enter your name." },
        { status: 400 }
      );
    }

    if (!isValidEmail(email) || email.length > 254) {
      return json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      `INSERT INTO waitlist
        (full_name, email, created_at)
       VALUES (?, ?, ?)`
    )
      .bind(fullName, email, createdAt)
      .run();

    const safeName = escapeHtml(fullName);

    let confirmationSent = false;
    let adminNotificationSent = false;
    let emailWarning = null;

    // D1 is the source of truth. Email failures do not erase the signup.
    try {
      await sendResendEmail(env, {
        from: `dots. <${env.RESEND_FROM_EMAIL}>`,
        to: [email],
        reply_to: env.EMAIL_TO || undefined,
        subject: "You're on the dots. early access list",
        html: `
<!doctype html>
<html>
  <body style="margin:0;background:#f7f7f5;color:#111;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:620px;margin:0 auto;padding:48px 24px">
      <div style="background:#fff;border:1px solid #e8e8e5;border-radius:24px;padding:40px">
        <div style="font-size:28px;font-weight:800;letter-spacing:-1px">dots<span style="color:#d0a84f">.</span></div>
        <div style="margin-top:48px">
          <p style="font-size:14px;color:#777;text-transform:uppercase;letter-spacing:2px">Early access</p>
          <h1 style="font-size:38px;line-height:1.05;letter-spacing:-1.5px;margin:12px 0 20px">
            You're on the list.
          </h1>
          <p style="font-size:17px;line-height:1.7;color:#555">
            Hi ${safeName}, your request for dots. early access is confirmed.
          </p>
          <p style="font-size:17px;line-height:1.7;color:#555">
            We'll email you when the next stage opens.
          </p>
        </div>
        <div style="margin-top:40px;padding-top:24px;border-top:1px solid #eee;color:#999;font-size:13px">
          dots. — precise oral care, rethought.
        </div>
      </div>
    </div>
  </body>
</html>`,
        text:
          `Hi ${fullName},\n\n` +
          `You're officially on the dots. early access list.\n\n` +
          `We'll email you when the next stage opens.\n\n` +
          `— dots.`,
      });

      confirmationSent = true;
    } catch (error) {
      console.error("Waitlist confirmation email failed:", error);
      emailWarning = "Your signup was saved, but the confirmation email could not be sent.";
    }

    if (env.EMAIL_TO) {
      try {
        await sendResendEmail(env, {
          from: `dots. <${env.RESEND_FROM_EMAIL}>`,
          to: [env.EMAIL_TO],
          subject: `New dots. waitlist signup — ${fullName}`,
          html: `
            <h2>New dots. waitlist signup</h2>
            <p><strong>Name:</strong> ${safeName}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Joined:</strong> ${escapeHtml(createdAt)}</p>
          `,
          text:
            `New dots. waitlist signup\n\n` +
            `Name: ${fullName}\n` +
            `Email: ${email}\n` +
            `Joined: ${createdAt}`,
        });

        adminNotificationSent = true;
      } catch (error) {
        console.error("Admin waitlist notification failed:", error);
      }
    }

    return json({
      success: true,
      message: "You're on the dots. waitlist.",
      confirmationSent,
      adminNotificationSent,
      warning: emailWarning,
    });
  } catch (error) {
    console.error("Waitlist API error:", error);

    if (
      String(error?.message || "").toLowerCase().includes("unique constraint")
    ) {
      return json(
        { error: "This email is already on the waitlist." },
        { status: 409 }
      );
    }

    return json(
      { error: "We couldn't complete your signup. Please try again." },
      { status: 500 }
    );
  }
}
