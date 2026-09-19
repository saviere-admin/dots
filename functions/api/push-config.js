import { json } from './_utils.js';

export async function onRequest(context) {
    return json({ 
        publicKey: context.env.VAPID_PUBLIC_KEY || null 
    });
}