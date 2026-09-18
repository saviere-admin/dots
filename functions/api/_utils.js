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

export async function saveToAirtable(entry, env) {
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) return 'not-configured';

  const table = encodeURIComponent(env.AIRTABLE_TABLE_NAME || 'Waitlist');
  const response = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        Name: entry.fullName,
        Email: entry.email,
        Phone: entry.phone,
        Category: entry.category,
        Interest: entry.interest,
        Notes: entry.notes,
        'Created At': entry.createdAt,
      },
    }),
  });

  if (!response.ok) throw new Error(`Airtable returned ${response.status}.`);
  return 'saved';
}

export async function sendEmail({ to, subject, html }, env) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return 'not-configured';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    }),
  });

  if (!response.ok) throw new Error(`Resend returned ${response.status}.`);
  return 'sent';
}
