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
        return new Response(JSON.stringify({ error: "Missing System Password or Developer Token." }), { status: 401 });
    }

    // THE FIX: Fallback to the hardcoded password if Cloudflare env variables aren't set up yet
    const expectedPassword = env.ADMIN_PASSWORD || "Saviere@798959885#";

    if (adminPassword !== expectedPassword) {
        return new Response(JSON.stringify({ error: "Invalid System Password." }), { status: 401 });
    }

    // Enforce the ghp_ prefix so the user doesn't accidentally type the token name
    if (!githubToken.startsWith("ghp_") && !githubToken.startsWith("github_pat_")) {
        return new Response(JSON.stringify({ 
            error: "Invalid Token Format. A GitHub PAT must start with 'ghp_' or 'github_pat_'." 
        }), { status: 401 });
    }

    // Verify the token is active via GitHub Rate Limit endpoint (Bypasses strict scope requirements)
    try {
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