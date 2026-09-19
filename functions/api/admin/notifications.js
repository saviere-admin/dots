import { json } from '../_utils.js';
import { withAdmin } from './_auth.js';

// We do not escape HTML for the message body anymore because we want to send raw HTML
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

async function sendEmail(entry, subject, htmlContent, env) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) return false;
  
  const unsubscribeLink = `https://usedots.in/api/unsubscribe?email=${encodeURIComponent(entry.email)}`;
  
  // Wrap the admin's HTML content and append the compliant footer
  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #520a1e; max-width: 600px; margin: 0 auto; line-height: 1.6;">
      ${htmlContent}
      <hr style="border: none; border-top: 1px solid #eaeaea; margin-top: 40px; margin-bottom: 20px;" />
      <p style="font-size: 12px; color: #666; text-align: center;">
        dots. © 2026 All rights reserved.<br>A brand of Savière Group Private Limited.<br><br>
        <a href="${unsubscribeLink}" style="color: #666; text-decoration: underline;">Unsubscribe from early access updates</a>
      </p>
    </div>
  `;

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: `"dots." <${env.RESEND_FROM_EMAIL}>`, // Sends as: dots. <doyou@usedots.in>
      to: [entry.email],
      subject: subject,
      html: htmlBody,
    }),
  });
  
  return response.ok;
}

export async function onRequestGet(context) {
  return withAdmin(context, async (_, env) => json({ ok: true, notifications: await readHistory(env) }));
}

export async function onRequestPost(context) {
  return withAdmin(context, async (token, env) => {
    const { request } = context;
    const body = await request.json();
    const subject = String(body.subject || '').trim();
    const message = String(body.message || '').trim(); // This is now HTML
    
    if (!subject || !message) return json({ ok: false, message: 'Subject and message are required.' }, 400);
    if (!env.DB) return json({ ok: false, message: 'Cloudflare D1 is not configured. Bind the database as DB.' }, 503);

    // Fetch waitlist, explicitly excluding people who have unsubscribed
    const result = await env.DB.prepare(`
      SELECT email, full_name AS fullName FROM waitlist WHERE unsubscribed = 0 OR unsubscribed IS NULL
    `).all();
    const audience = result.results || [];

    const results = await Promise.all(audience.map((entry) => sendEmail(entry, subject, message, env)));
    
    const delivery = {
      sent: results.filter(Boolean).length,
      failed: results.filter((sent) => !sent).length,
      status: env.RESEND_API_KEY && env.RESEND_FROM_EMAIL ? 'sent' : 'not-configured',
    };
    
    const createdAt = new Date().toISOString();
    
    const insertResult = await env.DB.prepare(`
      INSERT INTO notifications (subject, message, sent_count, failed_count, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(subject, message, delivery.sent, delivery.failed, createdAt).run();
    
    const notification = { id: insertResult.meta.last_row_id, subject, message, createdAt, delivery };
    return json({ ok: true, notification }, 201);
  });
}