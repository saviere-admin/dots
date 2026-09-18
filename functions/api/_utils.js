export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizePayload(body = {}) {
  const entry = {
    fullName: text(body.fullName || body.name),
    email: text(body.email).toLowerCase(),
    phone: text(body.phone),
    category: text(body.category),
    interest: text(body.interest),
    notes: text(body.notes),
    createdAt: new Date().toISOString(),
  };

  if (!entry.fullName || !entry.email) {
    return { error: 'Full name and email are required.' };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
    return { error: 'Please provide a valid email address.' };
  }

  return { entry };
}

export async function saveToD1(entry, env) {
  if (!env.DB) throw new Error('Cloudflare D1 is not configured. Bind the database as DB.');

  await env.DB.prepare(`
    INSERT INTO waitlist (full_name, email, phone, category, interest, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      full_name = excluded.full_name,
      phone = excluded.phone,
      category = excluded.category,
      interest = excluded.interest,
      notes = excluded.notes
  `).bind(entry.fullName, entry.email, entry.phone, entry.category, entry.interest, entry.notes, entry.createdAt).run();

  return 'saved';
}

export async function sendEmail({ to, subject, html }, env) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    console.warn('Resend email sending skipped: RESEND_API_KEY or RESEND_FROM_EMAIL not configured.');
    return 'not-configured';
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY.trim()}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL.trim(),
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Resend API returned ${response.status}:`, errorText);
      return 'failed';
    }

    return 'sent';
  } catch (err) {
    console.error('Network failure calling Resend:', err.message);
    return 'failed';
  }
}
