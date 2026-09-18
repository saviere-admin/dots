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

export async function saveToBaserow(entry, env) {
  if (!env.BASEROW_TOKEN || !env.BASEROW_TABLE_ID) return 'not-configured';

  const apiUrl = (env.BASEROW_API_URL || 'https://api.baserow.io').replace(/\/$/, '');
  const response = await fetch(`${apiUrl}/api/database/rows/table/${encodeURIComponent(env.BASEROW_TABLE_ID)}/?user_field_names=true`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.BASEROW_TOKEN}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      Name: entry.fullName,
      Email: entry.email,
      Phone: entry.phone,
      Category: entry.category,
      Interest: entry.interest,
      Notes: entry.notes,
      'Created At': entry.createdAt,
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    const error = new Error(response.status === 404
      ? 'Baserow could not find the configured table. Check BASEROW_TABLE_ID and workspace access.'
      : `Baserow returned ${response.status}.`);
    console.error('Baserow response:', details);
    throw error;
  }
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
