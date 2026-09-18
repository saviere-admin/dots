import { json } from './_utils.js';

export function onRequestGet({ env }) {
  return json({
    ok: true,
    message: 'dots. Cloudflare Pages API healthy',
    services: {
      airtable: Boolean(env.AIRTABLE_API_KEY && env.AIRTABLE_BASE_ID),
      resend: Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL),
      githubAdmin: Boolean(String(env.GITHUB_ADMIN_USERNAME || '').trim()),
      notificationHistory: Boolean(env.NOTIFICATION_HISTORY),
      pushSubscriptions: Boolean(env.PUSH_SUBSCRIPTIONS),
    },
  });
}
