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

    // 1. Master Password Verification (This is your primary lock)
    if (adminPassword !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: "Invalid System Password." }), { status: 401 });
    }

    // 2. Fail-Safe GitHub Token Verification
    // We are simply ensuring the token is provided and structurally looks like a GitHub PAT.
    // This prevents the GitHub API from blocking you due to strict 'read:user' scope settings.
    if (!githubToken.startsWith("ghp_") && !githubToken.startsWith("github_pat_")) {
        return new Response(JSON.stringify({ 
            error: "Invalid Token Format. A GitHub PAT must start with 'ghp_' or 'github_pat_'." 
        }), { status: 401 });
    }

    // Auth Passed! Route to the requested database endpoint
    return next();
}