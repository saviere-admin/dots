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
        return new Response(JSON.stringify({ error: "Missing authentication credentials." }), { status: 401 });
    }

    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid Admin Password." }), { status: 401 });
    }

    try {
        const ghResponse = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `token ${githubToken}`,
                "User-Agent": "dots-admin-console",
                "Accept": "application/vnd.github.v3+json"
            }
        });

        if (!ghResponse.ok) {
            const ghError = await ghResponse.text();
            return new Response(JSON.stringify({ error: `GitHub API Error: ${ghError}` }), { status: 401 });
        }

        const ghUser = await ghResponse.json();
        const expectedUser = (env.GITHUB_ADMIN_USERNAME || "saviere-admin").toLowerCase();
        
        if (ghUser.login.toLowerCase() !== expectedUser) {
            return new Response(JSON.stringify({ error: `Unauthorized. Expected ${expectedUser}, got ${ghUser.login}` }), { status: 403 });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: `Network error verifying GitHub token: ${err.message}` }), { status: 500 });
    }

    return next();
}