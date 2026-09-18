import { json } from '../_utils.js';
import { withAdmin } from './_auth.js';

async function readWaitlist(env) {
  if (!env.AIRTABLE_API_KEY || !env.AIRTABLE_BASE_ID) {
    throw new Error('Airtable is not configured in Cloudflare Pages.');
  }

  const table = encodeURIComponent(env.AIRTABLE_TABLE_NAME || 'Waitlist');
  const response = await fetch(`https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${table}?pageSize=100`, {
    headers: { Authorization: `Bearer ${env.AIRTABLE_API_KEY}` },
  });
  if (!response.ok) {
    const details = await response.text();
    console.error('Airtable response:', details);
    throw new Error(response.status === 404
      ? 'Airtable could not find the configured base or table. Check AIRTABLE_BASE_ID, AIRTABLE_TABLE_NAME, and PAT base access.'
      : `Airtable returned ${response.status}.`);
  }
  const result = await response.json();

  return (result.records || []).map(({ fields = {} }) => ({
    fullName: fields.Name || '',
    email: fields.Email || '',
    phone: fields.Phone || '',
    category: fields.Category || '',
    interest: fields.Interest || '',
    notes: fields.Notes || '',
    createdAt: fields['Created At'] || '',
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
