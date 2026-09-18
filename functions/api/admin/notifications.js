import { json } from '../_utils.js';
import { withAdmin } from './_auth.js';
import { readWaitlist } from './waitlist.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function readHistory(env) {
  if (!env.NOTIFICATION_HISTORY) return [];
  return (await env.NOTIFICATION_HISTORY.get('history', 'json')) || [];
}

async function sendEmail(entry, subject, message, env) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return false;
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [entry.email],
      subject,
      html: `<h2>${escapeHtml(subject)}</h2><p>${escapeHtml(message).replace(/\n/g, '<br />')}</p><p>dots.</p>`,
    }),
  });
  return response.ok;
}

export async function onRequestGet({ request, env }) {
  return withAdmin(request, env, async () => json({ ok: true, notifications: await readHistory(env) }));
}

export async function onRequestPost({ request, env }) {
  return withAdmin(request, env, async () => {
    const body = await request.json();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim();
    if (!subject || !message) return json({ ok: false, message: 'Subject and message are required.' }, 400);
    if (!env.NOTIFICATION_HISTORY) return json({ ok: false, message: 'NOTIFICATION_HISTORY KV is not configured in Cloudflare Pages.' }, 503);

    const audience = await readWaitlist(env);
    const results = await Promise.all(audience.map((entry) => sendEmail(entry, subject, message, env)));
    const delivery = {
      sent: results.filter(Boolean).length,
      failed: results.filter((sent) => !sent).length,
      status: env.RESEND_API_KEY && env.RESEND_FROM_EMAIL ? 'sent' : 'not-configured',
    };
    const notification = { id: `notification-${Date.now()}`, subject, message, createdAt: new Date().toISOString(), delivery };
    const history = await readHistory(env);
    await env.NOTIFICATION_HISTORY.put('history', JSON.stringify([notification, ...history].slice(0, 100)));
    return json({ ok: true, notification }, 201);
  });
}
