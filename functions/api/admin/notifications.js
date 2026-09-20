import { json } from '../_utils.js';

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { subject, html, selectedEmails } = await request.json();

        // Ensure we actually have targets
        if (!selectedEmails || !Array.isArray(selectedEmails) || selectedEmails.length === 0) {
            return json({ error: "No recipients selected." }, { status: 400 });
        }

        // Prepare Resend Payload
        // We use BCC so recipients cannot see each other's emails
        const resendPayload = {
            from: `dots. <${env.RESEND_FROM_EMAIL}>`,
            to: [env.EMAIL_TO], // Sends to your admin email as primary
            bcc: selectedEmails, // Blind copies the selected waitlist users
            subject: subject,
            html: html
        };

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

        // Log the notification to the D1 Database
        await env.DB.prepare("INSERT INTO notifications (subject, body, sent_count) VALUES (?, ?, ?)")
            .bind(subject, html, selectedEmails.length)
            .run();

        return json({ success: true, count: selectedEmails.length });
    } catch (error) {
        return json({ error: error.message }, { status: 500 });
    }
}