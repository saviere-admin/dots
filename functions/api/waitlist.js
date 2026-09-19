const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password, X-GitHub-Pat"
};

export async function onRequestOptions() {
    return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet({ request, env }) {
    try {
        const adminPass = request.headers.get('X-Admin-Password');
        const githubPat = request.headers.get('X-GitHub-Pat');

        if (adminPass !== env.ADMIN_PASSWORD || githubPat !== env.GITHUB_PAT) {
            return new Response('Unauthorized', { status: 401, headers: corsHeaders });
        }

        // IMPORTANT: Ensure your Cloudflare D1 database is bound to the variable 'DB'
        // Change "waitlist" to "notifications" if that is your table name
        const { results } = await env.DB.prepare("SELECT * FROM waitlist ORDER BY id DESC LIMIT 100").all();

        return new Response(JSON.stringify(results), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        });

    } catch (err) {
        return new Response(`DB Error: ${err.message}`, { status: 500, headers: corsHeaders });
    }
}