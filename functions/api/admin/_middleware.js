export async function onRequest(context) {
    const { request, env, next } = context;

    // 1. Handle CORS Preflight for the SPA
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

    // 2. Level 1: Verify Static Admin Password
    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid Admin Password." }), { status: 401 });
    }

    // 3. Level 2: Verify GitHub PAT via GitHub API
    try {
        const ghResponse = await fetch("https://api.github.com/user", {
            headers: {
                "Authorization": `token ${githubToken}`,
                "User-Agent": "dots-admin-console"
            }
        });

        if (!ghResponse.ok) {
            return new Response(JSON.stringify({ error: "Invalid GitHub Personal Access Token." }), { status: 401 });
        }

        const ghUser = await ghResponse.json();
        
        // Ensure the token belongs exactly to the specified admin username
        if (ghUser.login !== env.GITHUB_ADMIN_USERNAME) {
            return new Response(JSON.stringify({ error: `Unauthorized. Expected ${env.GITHUB_ADMIN_USERNAME}, got ${ghUser.login}` }), { status: 403 });
        }
    } catch (err) {
        return new Response(JSON.stringify({ error: "GitHub verification failed due to network error." }), { status: 500 });
    }

    // 4. Auth Passed, proceed to the requested API endpoint
    return next();
}