import { json } from './_utils.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { email } = await request.json();
        
        if (!email) {
            return json({ error: "Email required" }, { status: 400 });
        }

        const info = await env.DB.prepare("DELETE FROM waitlist WHERE email = ?")
            .bind(email)
            .run();

        return json({ success: true, removed: info.meta.changes > 0 });
    } catch (error) {
        return json({ error: error.message }, { status: 500 });
    }
}