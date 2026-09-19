import { json } from './_utils.js';

export async function onRequestPost(context) {
    return json({ error: "Endpoint deprecated. Use /api/admin/notifications" }, { status: 410 });
}