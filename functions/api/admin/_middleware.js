export async function onRequest(context) {
    const { request, env, next } = context;

    // CORS for Admin SPA
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
        return new Response(JSON.stringify({ error: "Missing authorization headers." }), { status: 401 });
    }

    // 1. Master Password Check
    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid System Password." }), { status: 401 });
    }

    // 2. GitHub Token Verification
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
                error: `GitHub rejected token: ${ghError.message}. Check token scopes.` 
            }), { status: 401 });
        }

        const ghUser = await ghResponse.json();
        const loginName = ghUser.login.toLowerCase();
        const expectedUser = (env.GITHUB_ADMIN_USERNAME || "saviere-admin").toLowerCase();
        
        // FOOLPROOF FIX: Allow either "saviere-admin" OR "dots-company" to authenticate
        if (loginName !== expectedUser && loginName !== "dots-company") {
             return new Response(JSON.stringify({ 
                error: `Token belongs to ${ghUser.login}. Expected dots-company or ${expectedUser}.` 
            }), { status: 403 });
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: `Cloudflare Network Error: ${err.message}` }), { status: 500 });
    }

    return next(); // Auth passed, proceed to API
}