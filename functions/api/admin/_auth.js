import { json } from '../_utils.js';

export async function onRequestGet(context) {
    // If the request reaches here, it has already passed _middleware.js auth checks
    return json({ success: true, message: "Authorized" });
}