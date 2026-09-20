import { json } from "./_utils.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const email = String(url.searchParams.get("email") || "")
    .trim()
    .toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      "<h1>Invalid unsubscribe link</h1>",
      {
        status: 400,
        headers: {
          "Content-Type": "text/html; charset=utf-8"
        }
      }
    );
  }

  try {
    await env.DB.prepare(
      "DELETE FROM waitlist WHERE email = ?"
    )
      .bind(email)
      .run();

    return new Response(
      `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Unsubscribed — dots.</title>
<style>
body {
  margin:0;
  background:#f3f1ef;
  font-family:Arial,Helvetica,sans-serif;
  color:#171717;
}
main {
  max-width:560px;
  margin:80px auto;
  padding:48px 28px;
  background:white;
  border-radius:18px;
  text-align:center;
}
.logo {
  font-size:30px;
  font-weight:800;
}
.dot {
  color:#d7aa3f;
}
a {
  color:#8d0011;
}
</style>
</head>
<body>
<main>
  <div class="logo">dots<span class="dot">.</span></div>
  <h1>You're unsubscribed.</h1>
  <p>
    You won't receive further dots. waitlist emails at this address.
  </p>
  <p>
    <a href="https://usedots.in/">Return to dots.</a>
  </p>
</main>
</body>
</html>`,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (error) {
    console.error("Unsubscribe error:", error);

    return new Response(
      "We couldn't process your unsubscribe request.",
      { status: 500 }
    );
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return json(
        { error: "Email required." },
        { status: 400 }
      );
    }

    await env.DB.prepare(
      "DELETE FROM waitlist WHERE email = ?"
    )
      .bind(email)
      .run();

    return json({ success: true });
  } catch (error) {
    console.error("Unsubscribe POST error:", error);

    return json(
      { error: "Unable to unsubscribe." },
      { status: 500 }
    );
  }
}