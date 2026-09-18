import { json } from '../_utils.js';

export async function requireAdmin(request, env) {
  try {
    const username = String(env?.GITHUB_ADMIN_USERNAME || 'saviere-admin').trim().toLowerCase();
    const token = String(request.headers.get('x-admin-token') || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

    if (!token) {
      return { response: json({ ok: false, message: 'Paste the GitHub PAT secret value, not its name or label.' }, 401) };
    }

    const response = await fetch('https://api.github.com/user', {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'dots-notification-console',
      },
    });

    if (!response.ok) {
      const message = response.status === 401
        ? 'GitHub rejected this PAT. Ensure the token has read-only user metadata access and is not expired.'
        : `GitHub returned status ${response.status}.`;
      return { response: json({ ok: false, message }, 401) };
    }

    const identity = await response.json();
    const githubLogin = String(identity?.login || '').toLowerCase();

    if (githubLogin !== username) {
      return { response: json({ ok: false, message: `This PAT belongs to "${identity.login}", but access requires "${username}".` }, 403) };
    }

    return { token };
  } catch (error) {
    return { response: json({ ok: false, message: `Auth error: ${error.message}` }, 500) };
  }
}

export async function withAdmin(context, handler) {
  // Cloudflare Pages Functions pass a single `context` object containing { request, env }
  const request = context.request || context;
  const env = context.env || {};

  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;
  
  try {
    return await handler(auth.token, env);
  } catch (err) {
    return json({ ok: false, message: `Handler error: ${err.message}` }, 500);
  }
}