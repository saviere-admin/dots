import { json } from '../_utils.js';

export async function requireAdmin(request, env) {
  try {
    const username = String(env?.GITHUB_ADMIN_USERNAME || 'saviere-admin').trim().toLowerCase();
    const token = String(request.headers.get('x-admin-token') || '').replace(/[\s\u200B-\u200D\uFEFF]/g, '').trim();

    if (!username) {
      return { response: json({ ok: false, message: 'GITHUB_ADMIN_USERNAME is not configured in Cloudflare Pages.' }, 503) };
    }
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
        ? 'GitHub rejected this PAT. Use the secret value, check that it is not expired or revoked, and create a new token if needed.'
        : `GitHub identity validation returned ${response.status}.`;
      return { response: json({ ok: false, message }, 401) };
    }

    const identity = await response.json();
    const githubLogin = String(identity?.login || '').toLowerCase();

    if (githubLogin !== username) {
      return { response: json({ ok: false, message: `This PAT belongs to GitHub user "${identity.login || 'unknown'}", but this console allows "${username}".` }, 403) };
    }

    return { token };
  } catch (error) {
    console.error('GitHub admin validation failed:', error.message);
    return { response: json({ ok: false, message: 'GitHub validation is temporarily unavailable.' }, 503) };
  }
}

export async function withAdmin(arg1, arg2, arg3) {
  let request;
  let env;
  let handler;

  if (typeof arg2 === 'function') {
    // Called as withAdmin(context, handler)
    request = arg1.request;
    env = arg1.env;
    handler = arg2;
  } else if (typeof arg3 === 'function') {
    // Called as withAdmin(request, env, handler)
    request = arg1;
    env = arg2;
    handler = arg3;
  } else {
    return json({ ok: false, message: 'Server configuration error: handler function not provided.' }, 500);
  }

  const auth = await requireAdmin(request, env);
  if (auth.response) return auth.response;

  try {
    return await handler(auth.token);
  } catch (error) {
    console.error('Admin handler execution failed:', error.message);
    return json({ ok: false, message: error.message || 'Internal handler error.' }, 500);
  }
}