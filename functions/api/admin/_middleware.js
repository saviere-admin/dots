export async function onRequest(context) {
    const { request, env, next } = context;

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

    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid System Password." }), { status: 401 });
    }

    if (!githubToken.startsWith("ghp_") && !githubToken.startsWith("github_pat_")) {
        return new Response(JSON.stringify({ 
            error: "Invalid Token Format. A GitHub PAT must start with 'ghp_' or 'github_pat_'." 
        }), { status: 401 });
    }

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

    return next();
}