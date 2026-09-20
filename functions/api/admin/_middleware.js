export async function onRequest(context) {
    const { request, env, next } = context;

    // Handle CORS for the Admin SPA
    if (request.method === "OPTIONS") {
        return new Response(null, {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "X-Admin-Password, X-GitHub-Token, Content-Type",
            }
        });
    }

    const adminPassword = request.headers.get("X-Admin-Password");
    const githubToken = request.headers.get("X-GitHub-Token");

    if (!adminPassword || !githubToken) {
        return new Response(JSON.stringify({ error: "Missing System Password or GitHub PAT." }), { status: 401 });
    }

    // 1. Master Password Verification
    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid System Password." }), { status: 401 });
    }

    // 2. Foolproof GitHub PAT Verification (Scope-Agnostic)
    try {
        // Hitting the rate_limit endpoint bypasses all scope restrictions.
        // If the token is fake or expired, it returns 401. If it is a real GitHub token, it returns 200.
        const ghResponse = await fetch("https://api.github.com/rate_limit", {
            headers: {
                "Authorization": `Bearer ${githubToken}`,
                "User-Agent": "dots-admin-console",
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!ghResponse.ok) {
            const ghError = await ghResponse.json();
            return new Response(JSON.stringify({ 
                error: `GitHub rejected the token: ${ghError.message}. Ensure your PAT is active.` 
            }), { status: 401 });
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: `Cloudflare Network Error: ${err.message}` }), { status: 500 });
    }

    // Auth Passed! Route to the requested database endpoint
    return next();
}