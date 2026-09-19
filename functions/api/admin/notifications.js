// Preconfigured HTML wrapper with dots. branding
const getBrandedHTML = (rawMessage) => `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 0;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <!-- Header -->
        <div style="background-color: #000000; padding: 30px; text-align: center;">
            <img src="https://usedots.in/public/brand/logos/dh/DotsTBWTWoS.png" alt="dots." style="max-width: 140px; height: auto; display: inline-block;">
        </div>
        
        <!-- Body -->
        <div style="padding: 40px 30px; color: #111827; font-size: 16px; line-height: 1.6;">
            ${rawMessage.replace(/\n/g, '<br>')}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 30px; text-align: center; color: #6b7280; font-size: 12px; line-height: 1.5;">
            <p style="margin: 0 0 10px 0;">Cruelty-Free &bull; Waterless &bull; Clinical Precision</p>
            <p style="margin: 0;">&copy; 2026 dots. All rights reserved.<br>A brand of Savière Group Private Limited.</p>
        </div>
    </div>
</body>
</html>
`;

export default {
    async fetch(request, env) {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

        const data = await request.json();
        
        let from = '';
        let to = [];
        let subject = '';
        let tags = [];

        // Route routing logic
        if (data.type === 'custom') {
            from = `dots. <${data.sender}>`;
            to = [data.recipient];
            subject = data.subject;
            if (data.trackOpens) {
                tags.push({ name: 'tracking', value: 'enabled' });
            }
        } else if (data.type === 'notification') {
            from = 'dots. <notifications@usedots.in>';
            subject = 'Update from dots.';
            tags.push({ name: 'category', value: 'notifications' });
            
            // 1. Fetch from D1 DB if targetList includes "all"
            if (data.targetList.includes('all')) {
                // const { results } = await env.DB.prepare("SELECT email FROM waitlist").all();
                // to = results.map(row => row.email);
            }
            
            // 2. Append extra emails
            if (data.extraEmails && data.extraEmails.length > 0) {
                to = [...new Set([...to, ...data.extraEmails])];
            }
        }

        const htmlContent = getBrandedHTML(data.message);

        // Sending via Resend API (Example)
        const emailPayload = {
            from: from,
            to: to,
            subject: subject,
            html: htmlContent,
            headers: {
                'X-Entity-Ref-ID': crypto.randomUUID(), // Prevent strict threading issues
            },
            tags: tags
        };

        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        return new Response(JSON.stringify({ success: res.ok }), { status: res.status });
    }
}