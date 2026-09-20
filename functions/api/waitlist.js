import { json, isValidEmail } from "./_utils.js";

const LOGO_URL =
  "https://usedots.in/public/brand/logos/dh/DotsTBBTWoS.png";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function normalizeEmail(value = "") {
  return String(value).trim().toLowerCase();
}

async function sendResendEmail(env, payload, idempotencyKey = "") {
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
      ...(idempotencyKey
        ? { "Idempotency-Key": idempotencyKey }
        : {})
    },
    body: JSON.stringify(payload)
  });

  const raw = await response.text();

  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = {
      message: raw
    };
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

/*
 * Shared dots. email shell.
 *
 * The logo is embedded using CID rather than relying on a remote image
 * being loaded by the recipient's email client.
 */
function emailShell({
  eyebrow = "",
  title = "",
  body = "",
  footerExtra = ""
}) {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f1ee;
    color:#111111;
    font-family:Arial,Helvetica,sans-serif;
  "
>
  <table
    role="presentation"
    width="100%"
    cellspacing="0"
    cellpadding="0"
    border="0"
    style="width:100%;border-collapse:collapse;background:#f4f1ee;"
  >
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table
          role="presentation"
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="
            width:100%;
            max-width:620px;
            border-collapse:separate;
          "
        >

          <!-- Crimson brand header -->
          <tr>
            <td
              style="
                background:#8f1230;
                border-radius:28px 28px 0 0;
                padding:34px 36px;
              "
            >
              <img
                src="cid:dots-logo"
                alt="dots."
                width="132"
                style="
                  display:block;
                  width:132px;
                  max-width:132px;
                  height:auto;
                  border:0;
                  outline:none;
                  text-decoration:none;
                "
              >
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td
              style="
                background:#ffffff;
                border-left:1px solid #e8e4e1;
                border-right:1px solid #e8e4e1;
                padding:44px 36px 40px;
              "
            >

              ${
                eyebrow
                  ? `
                    <p
                      style="
                        margin:0 0 10px;
                        color:#a16b78;
                        font-size:12px;
                        line-height:18px;
                        letter-spacing:2px;
                        text-transform:uppercase;
                        font-weight:700;
                      "
                    >
                      ${escapeHtml(eyebrow)}
                    </p>
                  `
                  : ""
              }

              <h1
                style="
                  margin:0 0 22px;
                  color:#111111;
                  font-size:38px;
                  line-height:1.08;
                  letter-spacing:-1.5px;
                  font-weight:800;
                "
              >
                ${escapeHtml(title)}
              </h1>

              ${body}

              ${
                footerExtra
                  ? `
                    <div
                      style="
                        margin-top:36px;
                        padding-top:24px;
                        border-top:1px solid #eeeeeb;
                      "
                    >
                      ${footerExtra}
                    </div>
                  `
                  : ""
              }

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                background:#ffffff;
                border:1px solid #e8e4e1;
                border-top:0;
                border-radius:0 0 28px 28px;
                padding:0 36px 34px;
              "
            >

              <div
                style="
                  border-top:1px solid #eeeeeb;
                  padding-top:24px;
                "
              >
                <p
                  style="
                    margin:0 0 8px;
                    color:#777777;
                    font-size:12px;
                    line-height:18px;
                  "
                >
                  dots. · Saviere Group Private Limited
                </p>

                <p
                  style="
                    margin:0 0 8px;
                    color:#999999;
                    font-size:12px;
                    line-height:18px;
                  "
                >
                  © 2026 Saviere Group Private Limited. All rights reserved.
                </p>

                <p
                  style="
                    margin:0;
                    color:#999999;
                    font-size:12px;
                    line-height:18px;
                  "
                >
                  You are receiving this email because you joined the dots.
                  early access list.
                  <a
                    href="mailto:${escapeHtml(env.EMAIL_TO || env.RESEND_FROM_EMAIL)}?subject=Unsubscribe%20from%20dots."
                    style="
                      color:#8f1230;
                      text-decoration:underline;
                    "
                  >
                    Unsubscribe
                  </a>
                </p>
              </div>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function logoAttachment() {
  return {
    path: LOGO_URL,
    filename: "dots-logo.png",
    content_id: "dots-logo",
    content_type: "image/png"
  };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return json(
        {
          error: "Invalid request body."
        },
        {
          status: 400
        }
      );
    }

    /*
     * Honeypot.
     *
     * Bots that populate this field receive a successful response but
     * never touch D1 or Resend.
     */
    const honeypot = String(body.website || "").trim();

    if (honeypot) {
      return json({
        success: true,
        confirmationSent: false,
        adminNotificationSent: false
      });
    }

    const name = String(body.name || "")
      .trim()
      .replace(/\s+/g, " ");

    const email = normalizeEmail(body.email);

    if (name.length < 2 || name.length > 120) {
      return json(
        {
          error: "Please enter your name."
        },
        {
          status: 400
        }
      );
    }

    if (!isValidEmail(email) || email.length > 254) {
      return json(
        {
          error: "Please enter a valid email address."
        },
        {
          status: 400
        }
      );
    }

    if (!env.DB) {
      return json(
        {
          error: "Waitlist database is not configured."
        },
        {
          status: 500
        }
      );
    }

    const createdAt = new Date().toISOString();

    /*
     * IMPORTANT:
     * Production D1 uses `name`, not `full_name`.
     */
    await env.DB.prepare(`
      INSERT INTO waitlist (
        name,
        email,
        created_at
      )
      VALUES (?, ?, ?)
    `)
      .bind(
        name,
        email,
        createdAt
      )
      .run();

    const safeName = escapeHtml(name);
    const safeEmail = escapeHtml(email);
    const safeCreatedAt = escapeHtml(createdAt);

    let confirmationSent = false;
    let adminNotificationSent = false;
    let emailWarning = null;

    /*
     * Email delivery is deliberately separated from the D1 write.
     *
     * The signup remains saved even if Resend fails.
     */
    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
      /*
       * ---------------------------------------------------------------
       * CUSTOMER CONFIRMATION
       * ---------------------------------------------------------------
       */

      try {
        const confirmationHtml = emailShell({
          eyebrow: "Early access",
          title: "You're on the list.",
          body: `
            <p
              style="
                margin:0 0 18px;
                color:#555555;
                font-size:17px;
                line-height:1.7;
              "
            >
              Hi ${safeName}, your place in the dots. early access list
              is confirmed.
            </p>

            <p
              style="
                margin:0;
                color:#555555;
                font-size:17px;
                line-height:1.7;
              "
            >
              We'll email you when the next chapter is ready.
            </p>
          `,
          footerExtra: `
            <p
              style="
                margin:0;
                color:#999999;
                font-size:13px;
                line-height:20px;
              "
            >
              dots. — precise oral care, rethought.
            </p>
          `
        });

        await sendResendEmail(
          env,
          {
            from: `dots. <${env.RESEND_FROM_EMAIL}>`,
            to: [email],
            reply_to: env.EMAIL_TO || undefined,
            subject: "You're on the dots. early access list",
            html: confirmationHtml,
            text:
              `Hi ${name},\n\n` +
              `You're on the dots. early access list.\n\n` +
              `Your place is confirmed. We'll email you when the next chapter is ready.\n\n` +
              `dots. — precise oral care, rethought.\n\n` +
              `© 2026 Saviere Group Private Limited.`,
            attachments: [
              logoAttachment()
            ],
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

        confirmationSent = true;
      } catch (error) {
        console.error(
          "Waitlist confirmation email failed:",
          error
        );

        emailWarning =
          "Your signup was saved, but the confirmation email could not be sent.";
      }

      /*
       * ---------------------------------------------------------------
       * ADMIN NOTIFICATION
       * ---------------------------------------------------------------
       */

      if (env.EMAIL_TO) {
        try {
          const adminHtml = emailShell({
            eyebrow: "New waitlist signup",
            title: "Someone joined dots.",
            body: `
              <table
                role="presentation"
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  width:100%;
                  border-collapse:collapse;
                  margin-top:8px;
                "
              >
                <tr>
                  <td
                    style="
                      padding:14px 0;
                      border-bottom:1px solid #eeeeeb;
                      color:#888888;
                      font-size:13px;
                      width:100px;
                    "
                  >
                    Name
                  </td>

                  <td
                    style="
                      padding:14px 0;
                      border-bottom:1px solid #eeeeeb;
                      color:#111111;
                      font-size:15px;
                      font-weight:700;
                    "
                  >
                    ${safeName}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:14px 0;
                      border-bottom:1px solid #eeeeeb;
                      color:#888888;
                      font-size:13px;
                    "
                  >
                    Email
                  </td>

                  <td
                    style="
                      padding:14px 0;
                      border-bottom:1px solid #eeeeeb;
                      color:#111111;
                      font-size:15px;
                    "
                  >
                    ${safeEmail}
                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:14px 0;
                      color:#888888;
                      font-size:13px;
                    "
                  >
                    Joined
                  </td>

                  <td
                    style="
                      padding:14px 0;
                      color:#111111;
                      font-size:15px;
                    "
                  >
                    ${safeCreatedAt}
                  </td>
                </tr>
              </table>
            `
          });

          await sendResendEmail(
            env,
            {
              from: `dots. <${env.RESEND_FROM_EMAIL}>`,
              to: [env.EMAIL_TO],
              subject: `New dots. waitlist signup — ${name}`,
              html: adminHtml,
              text:
                `New dots. waitlist signup\n\n` +
                `Name: ${name}\n` +
                `Email: ${email}\n` +
                `Joined: ${createdAt}`,
              attachments: [
                logoAttachment()
              ],
              tags: [
                {
                  name: "product",
                  value: "dots"
                },
                {
                  name: "category",
                  value: "waitlist-admin-alert"
                }
              ]
            },
            `waitlist-admin-alert-${createdAt}-${email}`
          );

          adminNotificationSent = true;
        } catch (error) {
          console.error(
            "Admin waitlist notification failed:",
            error
          );
        }
      }
    }

    return json({
      success: true,
      message: "You're on the dots. waitlist.",
      confirmationSent,
      adminNotificationSent,
      warning: emailWarning
    });
  } catch (error) {
    console.error(
      "Waitlist API error:",
      error
    );

    const message = String(
      error?.message || ""
    ).toLowerCase();

    if (
      message.includes("unique constraint") ||
      message.includes("unique constraint failed") ||
      message.includes("already exists")
    ) {
      return json(
        {
          error: "This email is already on the waitlist."
        },
        {
          status: 409
        }
      );
    }

    return json(
      {
        error:
          "We couldn't complete your signup. Please try again."
      },
      {
        status: 500
      }
    );
  }
}