import { json } from '../_utils.js';
import { withAdmin } from './_auth.js';

export async function readWaitlist(env) {
  if (!env.DB) throw new Error('Cloudflare D1 is not configured. Bind the database as DB.');

  const result = await env.DB.prepare(`
    SELECT full_name AS fullName, email, phone, category, interest, notes, created_at AS createdAt
    FROM waitlist
    ORDER BY created_at DESC
  `).all();
  return result.results || [];
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
