import { json, isValidEmail } from "./_utils.js";
import {
  dotsEmail,
  dotsEmailText
} from "./_email.js";

async function sendResendEmail(env, payload, idempotencyKey) {
  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "Resend rejected the email."
    );
  }

  return data;
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();

    /*
     * Honeypot.
     */
    if (body.website) {
      return json({
        success: true
      });
    }

    const name = String(body.name || "")
      .trim()
      .replace(/\s+/g, " ");

    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (name.length < 2 || name.length > 100) {
      return json(
        {
          error: "Please enter your name."
        },
        400
      );
    }

    if (!isValidEmail(email) || email.length > 254) {
      return json(
        {
          error: "Please enter a valid email address."
        },
        400
      );
    }

    /*
     * Explicit duplicate check because the current production
     * waitlist schema does not rely on a UNIQUE email constraint.
     */
    const existing = await env.DB.prepare(`
      SELECT id
      FROM waitlist
      WHERE lower(email) = lower(?)
      LIMIT 1
    `)
      .bind(email)
      .first();

    if (existing) {
      return json(
        {
          error: "You're already on the dots. list."
        },
        409
      );
    }

    const createdAt = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO waitlist
        (name, email, created_at)
      VALUES (?, ?, ?)
    `)
      .bind(
        name,
        email,
        createdAt
      )
      .run();

    /*
     * Email delivery is deliberately non-blocking from the user's
     * signup perspective. The signup is already safely stored in D1.
     */
    if (
      env.RESEND_API_KEY &&
      env.RESEND_FROM_EMAIL
    ) {
      const unsubscribeUrl =
        `https://usedots.in/api/unsubscribe?email=${encodeURIComponent(email)}`;

      const confirmationHtml = dotsEmail({
        subject: "You're on the dots. list.",
        preheader:
          "Your place in dots. early access is confirmed.",
        greeting: `Hi ${name},`,
        bodyHtml: `
          <p style="margin:0 0 18px;">
            Your place in the <strong>dots.</strong> early access
            list is confirmed.
          </p>

          <p style="margin:0 0 18px;">
            We're building a simpler way to take care of your
            everyday oral care, and we'll let you know when the
            next chapter is ready.
          </p>

          <p style="margin:0;">
            You're in.
          </p>
        `,
        unsubscribeUrl
      });

      const confirmationText = dotsEmailText({
        subject: "You're on the dots. list.",
        greeting: `Hi ${name},`,
        body:
          "Your place in the dots. early access list is confirmed.\n\n" +
          "We're building a simpler way to take care of your everyday oral care, and we'll let you know when the next chapter is ready.\n\n" +
          "You're in.",
        unsubscribeUrl
      });

      try {
        await sendResendEmail(
          env,
          {
            from: `dots. <${env.RESEND_FROM_EMAIL}>`,
            to: [email],
            subject: "You're on the dots. list.",
            html: confirmationHtml,
            text: confirmationText,
            tags: [
              {
                name: "product",
                value: "dots"
              },
              {
                name: "category",
                value: "waitlist-confirmation"
              }
            ]
          },
          `waitlist-confirmation-${email}`
        );
      } catch (error) {
        console.error(
          "Waitlist confirmation email failed:",
          error
        );
      }

      /*
       * Internal notification.
       */
      if (env.EMAIL_TO) {
        try {
          const adminHtml = dotsEmail({
            subject: "New dots. waitlist signup",
            preheader: `${name} joined the dots. waitlist.`,
            greeting: "New signup",
            bodyHtml: `
              <p style="margin:0 0 10px;">
                <strong>Name:</strong> ${name}
              </p>

              <p style="margin:0 0 10px;">
                <strong>Email:</strong> ${email}
              </p>

              <p style="margin:0;">
                <strong>Joined:</strong> ${createdAt}
              </p>
            `
          });

          const adminText = dotsEmailText({
            subject: "New dots. waitlist signup",
            greeting: "New signup",
            body:
              `Name: ${name}\n` +
              `Email: ${email}\n` +
              `Joined: ${createdAt}`
          });

          await sendResendEmail(
            env,
            {
              from: `dots. <${env.RESEND_FROM_EMAIL}>`,
              to: [env.EMAIL_TO],
              subject: "New dots. waitlist signup",
              html: adminHtml,
              text: adminText,
              tags: [
                {
                  name: "product",
                  value: "dots"
                },
                {
                  name: "category",
                  value: "waitlist-admin"
                }
              ]
            },
            `waitlist-admin-${email}`
          );
        } catch (error) {
          console.error(
            "Waitlist admin notification failed:",
            error
          );
        }
      }
    }

    return json({
      success: true,
      message: "You're on the dots. list."
    });
  } catch (error) {
    console.error("Waitlist error:", error);

    return json(
      {
        error: "Something went wrong. Please try again."
      },
      500
    );
  }
}