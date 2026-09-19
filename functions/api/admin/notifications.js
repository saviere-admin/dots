import { json } from '../_utils.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { subject, html } = await request.json();

        // 1. Fetch waitlist from D1
        const { results: users } = await env.DB.prepare("SELECT email FROM waitlist").all();
        
        if (!users || users.length === 0) {
            return json({ error: "Waitlist is empty. No emails sent." }, { status: 400 });
        }

        const emails = users.map(u => u.email);

        // 2. Prepare Resend Payload (BCC for privacy)
        const resendPayload = {
            from: `dots. <${env.RESEND_FROM_EMAIL}>`,
            to: [env.EMAIL_TO], 
            bcc: emails,        
            subject: subject,
            html: html
        };

        // 3. Trigger Resend API
        const resendReq = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(resendPayload)
        });

        if (!resendReq.ok) {
            const errorData = await resendReq.text();
            throw new Error(`Resend API error: ${errorData}`);
        }

        // 4. Log the broadcast in D1
        await env.DB.prepare("INSERT INTO notifications (subject, body, sent_count) VALUES (?, ?, ?)")
            .bind(subject, html, emails.length)
            .run();

        return json({ success: true, count: emails.length });
    } catch (error) {
        return json({ error: error.message }, { status: 500 });
    }
}