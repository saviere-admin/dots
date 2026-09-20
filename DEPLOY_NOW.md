# dots. final deployment fix

## 1. Replace frontend files

Replace `/index.html` and `/app.js` with the supplied files.

The index uses a versioned `/app.js?v=20260920-2` URL so Cloudflare/browser caching cannot keep the broken calculator script.

## 2. Replace Pages Functions

Replace these files exactly:

- `functions/api/_utils.js`
- `functions/api/waitlist.js`
- `functions/api/admin/_auth.js`
- `functions/api/admin/_middleware.js`
- `functions/api/admin/login.js`
- `functions/api/admin/logout.js`
- `functions/api/admin/session.js`
- `functions/api/admin/waitlist.js`
- `functions/api/admin/notifications.js`
- `functions/api/admin/export.js`

## 3. Cloudflare secrets

The admin error `Authentication service is not configured correctly.` is produced when `ADMIN_PASSWORD` or `ADMIN_SESSION_SECRET` is missing (or invalidly configured). Set all three secrets:

```bash
npx wrangler pages secret put ADMIN_PASSWORD
npx wrangler pages secret put ADMIN_SESSION_SECRET
npx wrangler pages secret put RESEND_API_KEY
```

Do not put these in `wrangler.toml`, Git, HTML, or JavaScript.

`RESEND_FROM_EMAIL` and `EMAIL_TO` remain normal vars in `wrangler.toml`.

## 4. D1

Run the schema against the remote database:

```bash
npx wrangler d1 execute dots-waitlist --remote --file=./schema.sql
```

This is required before testing the waitlist if the production database does not already have the expected columns.

## 5. Deploy

```bash
npx wrangler pages deploy .
```

Or deploy through the connected GitHub/Cloudflare Pages project.

## Expected results

Calculator default state:

- 2 people
- 12 months
- 240 g plastic packaging avoided
- 1.2 kg freight mass reduction

Waitlist:

- signup is stored in D1
- user receives a confirmation email when Resend is configured
- `EMAIL_TO` receives a signup notification
- duplicate email returns a clear 409 message

Admin:

- password login creates an HttpOnly signed session cookie
- no GitHub PAT is required by the new admin login
- waitlist and notification endpoints require that session
