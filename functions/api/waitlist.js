import { json, normalizePayload, saveToBaserow, sendEmail } from './_utils.js';

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const normalized = normalizePayload(body);

    if (normalized.error) return json({ ok: false, message: normalized.error }, 400);

    const { entry } = normalized;
    const baserow = await saveToBaserow(entry, env);
    const teamEmail = await sendEmail({
      to: env.EMAIL_TO || 'doyou@usedots.in',
      subject: `New dots. waitlist signup: ${entry.fullName}`,
      html: `<h2>New waitlist entry</h2><p><strong>Name:</strong> ${entry.fullName}</p><p><strong>Email:</strong> ${entry.email}</p><p><strong>Phone:</strong> ${entry.phone || 'Not provided'}</p><p><strong>Category:</strong> ${entry.category || 'Not provided'}</p><p><strong>Interest:</strong> ${entry.interest || 'Not provided'}</p><p><strong>Notes:</strong> ${entry.notes || 'None'}</p>`,
    }, env);
    const welcomeEmail = await sendEmail({
      to: entry.email,
      subject: 'You are on the dots. early access list',
      html: `<h2>Welcome to dots.</h2><p>Hi ${entry.fullName},</p><p>You are on the early access list. We will be in touch when the first release opens.</p><p>dots.</p>`,
    }, env);

    return json({
      ok: true,
      message: 'Added to the dots. waitlist.',
      integrations: { baserow, resend: teamEmail, welcomeEmail },
    }, 201);
  } catch (error) {
    console.error('Cloudflare waitlist function failed:', error.message);
    const isConfigurationError = error.message.includes('Baserow') || error.message.includes('Resend');
    return json({
      ok: false,
      message: isConfigurationError ? error.message : 'The waitlist service is temporarily unavailable.',
    }, 503);
  }
}
