import { json } from './_utils.js';

export async function onRequestPost(context) {
    return json({ success: true, message: "Subscription endpoint deprecated. Using email waitlist." });
}