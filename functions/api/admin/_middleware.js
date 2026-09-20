export async function onRequest(context) {
    const { request, env, next } = context;

    // Handle CORS for the admin SPA
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

    // Level 1: Master Password
    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid System Password." }), { status: 401 });
    }

    // Level 2: GitHub PAT Validation (Made Foolproof)
    try {
        const ghResponse = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `Bearer ${githubToken}`,
                "User-Agent": "dots-admin-console",
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!ghResponse.ok) {
            const ghError = await ghResponse.json();
            return new Response(JSON.stringify({ 
                error: `GitHub Rejected Token: ${ghError.message}. Ensure PAT has 'read:user' permissions.` 
            }), { status: 401 });
        }

        const ghUser = await ghResponse.json();
        const loginName = ghUser.login.toLowerCase();
        
        // FOOLPROOF FIX: Explicitly allowing 'dots-company' alongside 'saviere-admin'
        if (loginName !== "saviere-admin" && loginName !== "dots-company") {
             return new Response(JSON.stringify({ 
                error: `Unauthorized User: Token belongs to ${ghUser.login}, expected dots-company.` 
            }), { status: 403 });
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: `Cloudflare Network Error: ${err.message}` }), { status: 500 });
    }

    // Auth Passed!
    return next();
}