import { json } from '../_utils.js';

export async function requireAdmin(request, env) {
  const username = String(env.GITHUB_ADMIN_USERNAME || '').trim().toLowerCase();
  const token = String(request.headers.get('x-admin-token') || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

  if (!username) return { response: json({ ok: false, message: 'GITHUB_ADMIN_USERNAME is not configured in Cloudflare Pages.' }, 503) };
  if (!token) return { response: json({ ok: false, message: 'Paste the GitHub PAT secret value, not its name or label.' }, 401) };

  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'dots-notification-console',
      },
    });
    const identity = await response.json();

    if (!response.ok || String(identity.login || '').toLowerCase() !== username) {
      return { response: json({ ok: false, message: 'That GitHub PAT is invalid or is not authorized for this console.' }, 401) };
    }

    return { token };
  } catch (error) {
    console.error('GitHub admin validation failed:', error.message);
    return { response: json({ ok: false, message: 'GitHub validation is temporarily unavailable.' }, 503) };
  }
}

export async function withAdmin(request, env, handler) {
  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  return handler(auth.token);
}
