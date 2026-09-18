import { json } from '../_utils.js';
import { withAdmin } from './_auth.js';

async function readWaitlist(env) {
  if (!env.BASEROW_TOKEN || !env.BASEROW_TABLE_ID) {
    throw new Error('Baserow is not configured in Cloudflare Pages.');
  }

  const apiUrl = (env.BASEROW_API_URL || 'https://api.baserow.io').replace(/\/$/, '');
  const response = await fetch(`${apiUrl}/api/database/rows/table/${encodeURIComponent(env.BASEROW_TABLE_ID)}/?user_field_names=true&size=200`, {
    headers: { Authorization: `Token ${env.BASEROW_TOKEN}` },
  });
  if (!response.ok) {
    const details = await response.text();
    console.error('Baserow response:', details);
    throw new Error(response.status === 404
      ? 'Baserow could not find the configured table. Check BASEROW_TABLE_ID and workspace access.'
      : `Baserow returned ${response.status}.`);
  }
  const result = await response.json();

  return (result.results || []).map((fields) => ({
    fullName: fields.Name || '',
    email: fields.Email || '',
    phone: fields.Phone || '',
    category: fields.Category || '',
    interest: fields.Interest || '',
    notes: fields.Notes || '',
    createdAt: fields['Created At'] || fields.created_on || '',
  }));
}

export async function onRequestGet({ request, env }) {
  return withAdmin(request, env, async () => {
    try {
      return json({ ok: true, waitlist: await readWaitlist(env) });
    } catch (error) {
      console.error('Cloudflare waitlist read failed:', error.message);
      return json({ ok: false, message: error.message }, 503);
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}

export { readWaitlist };
