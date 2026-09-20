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
        return new Response(JSON.stringify({ error: "Missing credentials." }), { status: 401 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid Admin Password." }), { status: 401 });
    }

    try {
        // Ping GitHub to verify the PAT
        const ghResponse = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `Bearer ${githubToken}`,
                "User-Agent": "dots-admin-console",
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!ghResponse.ok) {
            const ghError = await ghResponse.json();
            // This will tell you if it's a scope issue or a bad token
            return new Response(JSON.stringify({ 
                error: `GitHub rejected token: ${ghError.message}. Ensure PAT has 'read:user' scope.` 
            }), { status: 401 });
        }

        const ghUser = await ghResponse.json();
        const expectedUser = (env.GITHUB_ADMIN_USERNAME || "saviere-admin").toLowerCase();
        
        if (ghUser.login.toLowerCase() !== expectedUser) {
            return new Response(JSON.stringify({ 
                error: `Token belongs to ${ghUser.login}, expected ${expectedUser}.` 
            }), { status: 403 });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: `Network error: ${err.message}` }), { status: 500 });
    }

    return next(); // Auth passed, route to the requested API
}