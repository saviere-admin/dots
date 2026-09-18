import { json } from '../_utils.js';
import { withAdmin } from './_auth.js';
import { readWaitlist } from './waitlist.js';

export async function onRequestGet({ request, env }) {
  return withAdmin(request, env, async () => {
    try {
      const entries = await readWaitlist(env);
      const fields = ['fullName', 'email', 'phone', 'category', 'interest', 'notes', 'createdAt'];
      const csvEscape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
      const csv = [
        fields.join(','),
        ...entries.map((entry) => fields.map((field) => csvEscape(entry[field])).join(',')),
      ].join('\n');

      return new Response(csv, {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="dots-waitlist.csv"',
          'cache-control': 'no-store',
        },
      });
    } catch (error) {
      return json({ ok: false, message: error.message }, 503);
    }
  });
}
