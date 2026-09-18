import { json } from './_utils.js';

export function onRequestGet({ env }) {
  return json({
    ok: true,
    message: 'dots. Cloudflare Pages API healthy',
    services: {
      database: Boolean(env.DB),
      resend: Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL),
      githubAdmin: Boolean(String(env.GITHUB_ADMIN_USERNAME || '').trim()),
      pushSubscriptions: Boolean(env.PUSH_SUBSCRIPTIONS),
    },
  });
}
