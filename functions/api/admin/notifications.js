import { json } from '../_utils.js';
import { withAdmin } from './_auth.js';
import { readWaitlist } from './waitlist.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function readHistory(env) {
  if (!env.DB) throw new Error('Cloudflare D1 is not configured. Bind the database as DB.');
  const result = await env.DB.prepare(`
    SELECT id, subject, message, sent_count AS sent, failed_count AS failed, created_at AS createdAt
    FROM notifications
    ORDER BY created_at DESC
    LIMIT 100
  `).all();
  return (result.results || []).map((notification) => ({
    id: notification.id,
    subject: notification.subject,
    message: notification.message,
    createdAt: notification.createdAt,
    delivery: { sent: notification.sent, failed: notification.failed, status: 'sent' },
  }));
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
    if (!env.DB) return json({ ok: false, message: 'Cloudflare D1 is not configured. Bind the database as DB.' }, 503);

    const audience = await readWaitlist(env);
    const results = await Promise.all(audience.map((entry) => sendEmail(entry, subject, message, env)));
    const delivery = {
      sent: results.filter(Boolean).length,
      failed: results.filter((sent) => !sent).length,
      status: env.RESEND_API_KEY && env.RESEND_FROM_EMAIL ? 'sent' : 'not-configured',
    };
    const createdAt = new Date().toISOString();
    const result = await env.DB.prepare(`
      INSERT INTO notifications (subject, message, sent_count, failed_count, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(subject, message, delivery.sent, delivery.failed, createdAt).run();
    const notification = { id: result.meta.last_row_id, subject, message, createdAt, delivery };
    return json({ ok: true, notification }, 201);
  });
}
