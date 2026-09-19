export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!email) {
    return new Response('Email parameter missing.', { status: 400 });
  }

  try {
    if (!env.DB) throw new Error('D1 database not bound.');

    // Update the waitlist to mark this email as unsubscribed
    await env.DB.prepare(
      "UPDATE waitlist SET unsubscribed = 1 WHERE email = ?"
    ).bind(email.toLowerCase()).run();

    return new Response(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unsubscribed | dots.</title>
        <style>
          body { font-family: 'Poppins', sans-serif; background: #fdfaf6; color: #520a1e; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
          .container { max-width: 400px; padding: 2rem; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Unsubscribed</h2>
          <p>You have been successfully removed from the dots. early access list. You will no longer receive updates.</p>
        </div>
      </body>
      </html>
    `, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });
  } catch (error) {
    console.error('Unsubscribe error:', error.message);
    return new Response('Internal error processing unsubscribe. Please try again later.', { status: 500 });
  }
}