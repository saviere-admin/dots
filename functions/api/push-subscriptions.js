import { json } from './_utils.js';

export async function onRequestPost({ request, env }) {
  if (!env.PUSH_SUBSCRIPTIONS) {
    return json({ ok: false, message: 'Push subscriptions are not configured yet.' }, 503);
  }

  try {
    const subscription = await request.json();
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return json({ ok: false, message: 'Invalid push subscription.' }, 400);
    }

    const key = `subscription:${btoa(subscription.endpoint).replace(/[^a-z0-9]/gi, '').slice(0, 100)}`;
    await env.PUSH_SUBSCRIPTIONS.put(key, JSON.stringify(subscription));
    return json({ ok: true });
  } catch (error) {
    console.error('Push subscription failed:', error.message);
    return json({ ok: false, message: 'Could not save notification preferences.' }, 500);
  }
}
