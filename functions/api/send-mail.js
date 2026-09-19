const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Allows your frontend domain to connect
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password, X-GitHub-Pat"
};

// 1. Intercept and approve the browser's CORS preflight check
export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

// 2. Process the actual email dispatch
export async function onRequestPost({ request, env }) {
    try {
        // Authenticate credentials against Cloudflare Environment Variables
        const adminPass = request.headers.get('X-Admin-Password');
        const githubPat = request.headers.get('X-GitHub-Pat');

        // Note: Set ADMIN_PASSWORD and GITHUB_PAT in your Cloudflare Pages Settings -> Variables
        if (adminPass !== env.ADMIN_PASSWORD || githubPat !== env.GITHUB_PAT) {
            return new Response('Unauthorized: Invalid Credentials', { status: 401, headers: corsHeaders });
        }

        const data = await request.json();
        
        let from = '';
        let to = [];
        let subject = '';
        let tags = [];

        // Routing Logic
        if (data.type === 'custom') {
            from = `dots. <${data.sender}>`;
            to = [data.recipient];
            subject = data.subject;
            if (data.trackOpens) tags.push({ name: 'tracking', value: 'enabled' });
        } else if (data.type === 'notification') {
            from = 'dots. <notifications@usedots.in>';
            subject = data.subject || 'Update from dots.';
            tags.push({ name: 'category', value: 'notifications' });
            
            if (data.extraEmails && data.extraEmails.length > 0) {
                to = [...new Set([...to, ...data.extraEmails])];
            }
            if (data.excludeEmails && data.excludeEmails.length > 0) {
                to = to.filter(email => !data.excludeEmails.includes(email));
            }
        }

        if (to.length === 0) {
            return new Response('No valid recipients found.', { status: 400, headers: corsHeaders });
        }

        // Generate the branded HTML wrapper
        const htmlContent = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f9fafb; margin: 0; padding: 40px 0;">
            <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                <div style="background-color: #000000; padding: 30px; text-align: center;">
                    <img src="https://usedots.in/public/brand/logos/dh/DotsTBWTWoS.png" alt="dots." style="max-width: 140px; height: auto; display: inline-block;">
                </div>
                <div style="padding: 40px 30px; color: #111827; font-size: 16px; line-height: 1.6;">
                    ${data.message.replace(/\n/g, '<br>')}
                </div>
                <div style="background-color: #f3f4f6; padding: 30px; text-align: center; color: #6b7280; font-size: 12px; line-height: 1.5;">
                    <p style="margin: 0 0 10px 0;">Cruelty-Free &bull; Waterless &bull; Clinical Precision</p>
                    <p style="margin: 0;">&copy; 2026 dots. All rights reserved.<br>A brand of Savière Group Private Limited.</p>
                </div>
            </div>
        </body>
        </html>`;

        const emailPayload = {
            from,
            to,
            subject,
            html: htmlContent,
            headers: { 'X-Entity-Ref-ID': crypto.randomUUID() },
            tags
        };

        // Dispatch to Resend API
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(emailPayload)
        });

        if (!res.ok) {
            const errorText = await res.text();
            return new Response(errorText, { status: res.status, headers: corsHeaders });
        }

        return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });

    } catch (err) {
        return new Response(`Server Error: ${err.message}`, { status: 500, headers: corsHeaders });
    }
}