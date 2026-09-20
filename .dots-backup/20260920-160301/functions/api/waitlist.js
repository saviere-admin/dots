import { json } from './_utils.js';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));
}

async function sendResendEmail(env, payload) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      'Resend email failed'
    );
  }

  return data;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { name, email } = await request.json();

    const fullName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!fullName) {
      return json(
        { error: 'Name is required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const createdAt = new Date().toISOString();

    await env.DB
      .prepare(`
        INSERT INTO waitlist
          (full_name, email, created_at)
        VALUES (?, ?, ?)
      `)
      .bind(fullName, normalizedEmail, createdAt)
      .run();

    const safeName = escapeHtml(fullName);

    let welcomeEmail = null;
    let adminEmail = null;

    if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {

      // Confirmation to the person joining
      welcomeEmail = await sendResendEmail(env, {
        from: `dots. <${env.RESEND_FROM_EMAIL}>`,
        to: [normalizedEmail],
        subject: "You're on the dots. early access list",
        html: `
          <div style="font-family:Arial,sans-serif;line-height:1.6">
            <h1>Welcome to dots.</h1>

            <p>Hi ${safeName},</p>

            <p>
              You're officially on the dots. early access list.
            </p>

            <p>
              We'll let you know when the first release opens.
            </p>

            <p>
              — dots.
            </p>
          </div>
        `,
      });

      // Notification to you
      adminEmail = await sendResendEmail(env, {
        from: `dots. <${env.RESEND_FROM_EMAIL}>`,
        to: [env.EMAIL_TO],
        subject: `New dots. waitlist signup — ${fullName}`,
        html: `
          <h2>New waitlist signup</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${escapeHtml(normalizedEmail)}</p>
          <p><strong>Joined:</strong> ${createdAt}</p>
        `,
      });
    }

    return json({
      success: true,
      message: 'You are officially on the dots. waitlist.',
      email: normalizedEmail,
      confirmationSent: Boolean(welcomeEmail),
      adminNotificationSent: Boolean(adminEmail),
    });

  } catch (error) {

    if (
      error.message?.includes('UNIQUE constraint failed')
    ) {
      return json(
        { error: 'This email is already on the waitlist.' },
        { status: 409 }
      );
    }

    console.error('Waitlist error:', error);

    return json(
      {
        error: 'Unable to join the waitlist right now.'
      },
      { status: 500 }
    );
  }
}