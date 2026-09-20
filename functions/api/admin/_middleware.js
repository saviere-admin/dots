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
        return new Response(JSON.stringify({ error: "Missing authorization headers." }), { status: 401 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid Admin Password." }), { status: 401 });
    }

    try {
        const ghResponse = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `Bearer ${githubToken}`,
                "User-Agent": "dots-admin-console",
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!ghResponse.ok) {
            return new Response(JSON.stringify({ 
                error: `GitHub rejected the token. Ensure your PAT is valid and has 'read:user' permissions.` 
            }), { status: 401 });
        }

        const ghUser = await ghResponse.json();
        const expectedUser = (env.GITHUB_ADMIN_USERNAME || "saviere-admin").toLowerCase();
        
        // Relaxed check: warns if mismatch, but allows proceeding if token is mathematically valid
        // Remove the block below if you strictly want ONLY the exact username to pass
        if (ghUser.login.toLowerCase() !== expectedUser && ghUser.login !== "dots-company") {
             return new Response(JSON.stringify({ 
                error: `Token belongs to ${ghUser.login}. Expected ${expectedUser} or dots-company.` 
            }), { status: 403 });
        }

    } catch (err) {
        return new Response(JSON.stringify({ error: `Network error verifying GitHub token.` }), { status: 500 });
    }

    return next();
}