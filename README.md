# dots.

Launch storefront and waitlist API for dots., a subsidiary of Saviere Group.

## Notification console

Copy `.env.example` to `.env` and configure:

```env
GITHUB_ADMIN_USERNAME=your-github-username
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=verified-sender@your-domain.com
EMAIL_TO=doyou@usedots.in
VAPID_PUBLIC_KEY=your-web-push-public-key
```

Start the server with `npm start`, then open `/admin.html`. Enter a GitHub fine-grained PAT belonging to `GITHUB_ADMIN_USERNAME` to send email updates, view the private audience, and export `dots-waitlist.csv`.

Create the PAT with the minimum GitHub account access needed to identify the user, keep it out of source control, and only use the console over HTTPS. The PAT is sent to the backend for GitHub identity validation and is kept only in the browser session storage.

When Resend is configured, a new signup receives a welcome email and the dots. team receives the signup notification. Without Resend credentials, signups still reach D1 and the admin console records broadcasts as not configured.

## Cloudflare Pages deployment

Cloudflare Pages serves the site and runs the API from `functions/api/`. In the Pages project settings, add these production environment variables:

```env
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=verified-sender@your-domain.com
EMAIL_TO=doyou@usedots.in
```

Deploy from the repository root with no build command and the project root as the output directory. The public form calls the same-origin `/api/waitlist` Pages Function, so it works on the deployed Cloudflare domain. `server.js` remains available for local development with `npm start`.

### Browser notifications

Create a Cloudflare KV namespace named `PUSH_SUBSCRIPTIONS` and bind it to the Pages project with that exact variable name. Add the public half of a VAPID key pair as `VAPID_PUBLIC_KEY`. The site will then show an `Enable product updates` control, request notification permission from a user click, register `sw.js`, and store subscriptions in KV. Keep the VAPID private key server-side; it is required by a push delivery worker when you begin broadcasting browser notifications.

For the public admin console, the same D1 database stores waitlist entries and notification history. The admin routes are available under `/api/admin/*` on Cloudflare Pages and validate `x-admin-token` against GitHub using `GITHUB_ADMIN_USERNAME`.

### Easiest D1 setup

1. Create a D1 database named `dots-waitlist` in Cloudflare.
2. The repository's `wrangler.toml` binds it to Pages with variable name `DB` and the configured database ID.
3. Run `schema.sql` against the database using the Cloudflare D1 console or Wrangler:

```bash
npx wrangler d1 create dots-waitlist
npx wrangler d1 execute dots-waitlist --remote --file=./schema.sql
```

If Wrangler asks for a database ID, use the ID returned by the create command and update `wrangler.toml` before deploying.
4. Redeploy the Pages project.

The private `/admin.html` console becomes the dashboard: it shows the audience, sends updates, and exports CSV. D1 is permanently free within Cloudflare's free usage limits and has no external CRM trial period.
