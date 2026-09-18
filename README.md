# dots.

Launch storefront and waitlist API for dots., a subsidiary of Saviere Group.

## Notification console

Copy `.env.example` to `.env` and configure:

```env
GITHUB_ADMIN_USERNAME=your-github-username
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=verified-sender@your-domain.com
EMAIL_TO=doyou@usedots.in
```

Start the server with `npm start`, then open `/admin.html`. Enter a GitHub fine-grained PAT belonging to `GITHUB_ADMIN_USERNAME` to send email updates, view the private audience, and export `dots-waitlist.csv`.

Create the PAT with the minimum GitHub account access needed to identify the user, keep it out of source control, and only use the console over HTTPS. The PAT is sent to the backend for GitHub identity validation and is kept only in the browser session storage.

When Resend is configured, a new signup receives a welcome email and the dots. team receives the signup notification. Without Resend credentials, signups still persist locally and the admin console records broadcasts as not configured.

## Cloudflare Pages deployment

Cloudflare Pages serves the site and runs the API from `functions/api/`. In the Pages project settings, add these production environment variables:

```env
AIRTABLE_API_KEY=your-airtable-token
AIRTABLE_BASE_ID=your-airtable-base-id
AIRTABLE_TABLE_NAME=Waitlist
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=verified-sender@your-domain.com
EMAIL_TO=doyou@usedots.in
```

Deploy from the repository root with no build command and the project root as the output directory. The public form calls the same-origin `/api/waitlist` Pages Function, so it works on the deployed Cloudflare domain. `server.js` remains available for local development with `npm start`.
