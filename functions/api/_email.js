const SITE_URL = "https://usedots.in";
const LOGO_URL =
  "https://usedots.in/brand/logos/dh/DotsTBBTWoS.png";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function textToHtml(value = "") {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function safeSubject(value = "") {
  return String(value)
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 200);
}

export function dotsEmail({
  subject = "dots.",
  preheader = "",
  greeting = "",
  bodyHtml = "",
  unsubscribeUrl = "",
  ctaText = "",
  ctaUrl = ""
} = {}) {
  const safeSubjectText = escapeHtml(safeSubject(subject));
  const safePreheader = escapeHtml(preheader);
  const safeGreeting = escapeHtml(greeting);

  const cta =
    ctaText && ctaUrl
      ? `
        <tr>
          <td style="padding:8px 0 24px;">
            <a
              href="${escapeHtml(ctaUrl)}"
              style="
                display:inline-block;
                background:#ffffff;
                color:#a80f2d;
                text-decoration:none;
                font-family:Arial,Helvetica,sans-serif;
                font-size:14px;
                font-weight:700;
                padding:13px 20px;
                border-radius:999px;
              "
            >
              ${escapeHtml(ctaText)}
            </a>
          </td>
        </tr>
      `
      : "";

  const unsubscribe =
    unsubscribeUrl
      ? `
        <a
          href="${escapeHtml(unsubscribeUrl)}"
          style="color:#8b7d7f;text-decoration:underline;"
        >
          Unsubscribe
        </a>
      `
      : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeSubjectText}</title>
</head>

<body style="margin:0;padding:0;background:#f5f2f1;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    ${safePreheader}
  </div>

  <table
    role="presentation"
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f5f2f1;margin:0;padding:0;"
  >
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table
          role="presentation"
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="max-width:620px;background:#ffffff;border-radius:20px;overflow:hidden;"
        >

          <!-- Brand header -->
          <tr>
            <td
              style="
                background:#a80f2d;
                padding:30px 32px;
                text-align:center;
              "
            >
              <img
                src="${LOGO_URL}"
                width="132"
                alt="dots."
                style="
                  display:block;
                  width:132px;
                  max-width:100%;
                  height:auto;
                  margin:0 auto;
                  border:0;
                "
              >
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td
              style="
                padding:40px 36px 32px;
                font-family:Arial,Helvetica,sans-serif;
                color:#241f20;
              "
            >

              ${
                safeGreeting
                  ? `
                    <h1
                      style="
                        margin:0 0 20px;
                        font-size:26px;
                        line-height:1.2;
                        font-weight:700;
                        color:#241f20;
                      "
                    >
                      ${safeGreeting}
                    </h1>
                  `
                  : ""
              }

              <div
                style="
                  font-size:16px;
                  line-height:1.7;
                  color:#51494a;
                "
              >
                ${bodyHtml}
              </div>

              ${cta}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                padding:24px 36px 30px;
                border-top:1px solid #eee8e7;
                text-align:center;
                font-family:Arial,Helvetica,sans-serif;
              "
            >
              <div
                style="
                  font-size:13px;
                  line-height:1.6;
                  color:#8b7d7f;
                "
              >
                dots. — oral care, simplified.
              </div>

              <div
                style="
                  margin-top:6px;
                  font-size:12px;
                  line-height:1.6;
                  color:#9b8f90;
                "
              >
                A brand by Saviere Group Private Limited.
              </div>

              ${
                unsubscribe
                  ? `
                    <div
                      style="
                        margin-top:14px;
                        font-size:12px;
                        line-height:1.6;
                      "
                    >
                      ${unsubscribe}
                    </div>
                  `
                  : ""
              }

              <div
                style="
                  margin-top:14px;
                  font-size:11px;
                  color:#b0a5a6;
                "
              >
                © 2026 Saviere Group Private Limited. All rights reserved.
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function dotsEmailText({
  subject = "dots.",
  greeting = "",
  body = "",
  unsubscribeUrl = "",
  ctaText = "",
  ctaUrl = ""
} = {}) {
  const parts = [];

  if (greeting) {
    parts.push(greeting);
    parts.push("");
  }

  parts.push(body);

  if (ctaText && ctaUrl) {
    parts.push("");
    parts.push(`${ctaText}: ${ctaUrl}`);
  }

  parts.push("");
  parts.push("dots. — oral care, simplified.");
  parts.push("A brand by Saviere Group Private Limited.");
  parts.push("© 2026 Saviere Group Private Limited. All rights reserved.");

  if (unsubscribeUrl) {
    parts.push("");
    parts.push(`Unsubscribe: ${unsubscribeUrl}`);
  }

  return parts.join("\n");
}

export { escapeHtml, textToHtml };