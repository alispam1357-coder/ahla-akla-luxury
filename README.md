# أحلى أكلة

A bilingual homemade Egyptian food ordering site for Chef Soha El Akad.

## Run locally

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. For local development, leave `TURSO_DATABASE_URL` unset to use `database/ahla-akla.db`; set `ADMIN_PASSWORD` and `SESSION_SECRET`.
4. Generate Web Push keys with `node -e "console.log(require('web-push').generateVAPIDKeys())"`, then put the returned `publicKey` in `VAPID_PUBLIC_KEY`, the returned `privateKey` in `VAPID_PRIVATE_KEY`, and a contact such as `mailto:you@example.com` in `VAPID_SUBJECT`.
5. Run `npm start`.
6. Open http://localhost:3000.

Chef login: username `chef`, password from `ADMIN_PASSWORD` (development default: `chef1357`).

Production uses Turso/libSQL for the database and Vercel Blob for uploaded photos. Vercel's filesystem is never used for persistent data. Local development can continue using `database/ahla-akla.db`.

The server creates the hosted tables and indexes automatically without deleting existing menu data or orders. To migrate the existing local database to Turso, create the Turso database, set `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `BLOB_READ_WRITE_TOKEN`, then run `npm run migrate:db`. The migration copies all existing tables and uploads existing local product images to Blob. Set `BLOB_READ_WRITE_TOKEN` in Vercel before using product-photo uploads. Chef push registration requires HTTPS in production (localhost is allowed during development). Open `/admin`, log in, and allow notifications when prompted on every device that should receive new-order alerts.

## Vercel deployment

Import the repository into Vercel with **Framework Preset: Other**, **Build Command: empty**, **Output Directory: empty**, and **Install Command: `npm install`**. `vercel.json` routes `/api/*` to the serverless Express function and serves the existing `public` site.

Required Vercel environment variables: `ADMIN_PASSWORD`, `SESSION_SECRET`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `BLOB_READ_WRITE_TOKEN`. Optional variables are `TELEGRAM_BOT_TOKEN`, `CHEF_CHAT_ID`, `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, and `VAPID_PRIVATE_KEY`.
