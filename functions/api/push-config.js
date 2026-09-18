import { json } from './_utils.js';

export function onRequestGet({ env }) {
  return json({
    ok: true,
    publicKey: env.VAPID_PUBLIC_KEY || '',
  });
}
