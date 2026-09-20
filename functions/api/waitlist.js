export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        // Now expecting name and email
        const { name, email } = await request.json();
        
        if (!email || !email.includes('@')) {
            return new Response(JSON.stringify({ error: "Invalid email address provided." }), { status: 400 });
        }

        // Insert name and email into the D1 database
        await env.DB.prepare("INSERT INTO waitlist (name, email) VALUES (?, ?)")
            .bind(name || "Guest", email)
            .run();

        return new Response(JSON.stringify({ success: true }), {
            headers: { "Content-Type": "application/json" }
        });
    } catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return new Response(JSON.stringify({ error: "This email is already on the waitlist." }), { status: 400 });
        }
        return new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 });
    }
}