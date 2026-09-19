export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { subject, html } = await request.json();

        // 1. Fetch all emails from the D1 Database
        const { results: users } = await env.DB.prepare("SELECT email FROM waitlist").all();
        
        if (!users || users.length === 0) {
            return new Response(JSON.stringify({ error: "Waitlist is empty. No emails sent." }), { status: 400 });
        }

        const emails = users.map(u => u.email);

        // 2. Prepare Resend Payload (Using BCC to protect user privacy)
        const resendPayload = {
            from: `dots. <${env.RESEND_FROM_EMAIL}>`,
            to: [env.EMAIL_TO], // Sends to admin email as the primary recipient
            bcc: emails,        // Blind copies the waitlist
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

        // 4. Log the notification broadcast in D1
        await env.DB.prepare("INSERT INTO notifications (subject, body, sent_count) VALUES (?, ?, ?)")
            .bind(subject, html, emails.length)
            .run();

        return new Response(JSON.stringify({ success: true, count: emails.length }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
}