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
NOTIFICATION_HISTORY=bind-a-cloudflare-kv-namespace
```

Start the server with `npm start`, then open `/admin.html`. Enter a GitHub fine-grained PAT belonging to `GITHUB_ADMIN_USERNAME` to send email updates, view the private audience, and export `dots-waitlist.csv`.

Create the PAT with the minimum GitHub account access needed to identify the user, keep it out of source control, and only use the console over HTTPS. The PAT is sent to the backend for GitHub identity validation and is kept only in the browser session storage.

When Resend is configured, a new signup receives a welcome email and the dots. team receives the signup notification. Without Resend credentials, signups still reach Baserow and the admin console records broadcasts as not configured.

## Cloudflare Pages deployment

Cloudflare Pages serves the site and runs the API from `functions/api/`. In the Pages project settings, add these production environment variables:

```env
BASEROW_API_URL=https://api.baserow.io
BASEROW_TOKEN=your-baserow-database-token
BASEROW_TABLE_ID=your-baserow-table-id
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=verified-sender@your-domain.com
EMAIL_TO=doyou@usedots.in
```

Deploy from the repository root with no build command and the project root as the output directory. The public form calls the same-origin `/api/waitlist` Pages Function, so it works on the deployed Cloudflare domain. `server.js` remains available for local development with `npm start`.

### Browser notifications

Create a Cloudflare KV namespace named `PUSH_SUBSCRIPTIONS` and bind it to the Pages project with that exact variable name. Add the public half of a VAPID key pair as `VAPID_PUBLIC_KEY`. The site will then show an `Enable product updates` control, request notification permission from a user click, register `sw.js`, and store subscriptions in KV. Keep the VAPID private key server-side; it is required by a push delivery worker when you begin broadcasting browser notifications.

For the public admin console, also create and bind a KV namespace named `NOTIFICATION_HISTORY`. The admin routes are available under `/api/admin/*` on Cloudflare Pages and validate `x-admin-token` against GitHub using `GITHUB_ADMIN_USERNAME`.

### Easiest Baserow setup

1. Create a free Baserow cloud workspace at `baserow.io`.
2. Create a database named `dots. Waitlist` and a table named `Waitlist`.
3. Add these fields with these exact names: `Name`, `Email`, `Phone`, `Category`, `Interest`, `Notes`, and `Created At`.
4. Create a Baserow database token with read/write access to this database.
5. Copy the numeric table ID from the Baserow table URL or API documentation.
6. Put `BASEROW_TOKEN`, `BASEROW_TABLE_ID`, and `BASEROW_API_URL` into Cloudflare Pages **Production** variables.
7. Save, then create a new deployment.

Your Baserow workspace becomes the dashboard: use its grid, filters, views, and built-in CSV export to manage the waitlist. The admin console continues to show and export the same audience.
