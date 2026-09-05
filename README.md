# أحلى أكلة

A bilingual homemade Egyptian food ordering site for Chef Soha El Akad.

## Run locally

1. Install Node.js 18+.
2. Run `npm install`.
3. Copy `.env.example` to `.env`. Set a long `SESSION_SECRET`, a strong `ADMIN_PASSWORD`, and optionally the Telegram values.
4. Generate Web Push keys with `node -e "console.log(require('web-push').generateVAPIDKeys())"`, then put the returned `publicKey` in `VAPID_PUBLIC_KEY`, the returned `privateKey` in `VAPID_PRIVATE_KEY`, and a contact such as `mailto:you@example.com` in `VAPID_SUBJECT`.
5. Run `npm start`.
6. Open http://localhost:3000.

Chef login: username `chef`, password from `ADMIN_PASSWORD` (development default: `chef1357`).

Orders are stored in SQLite at `database/ahla-akla.db`. Uploaded photos are stored under `public/uploads`.

The server creates the `push_subscriptions` table and index automatically at startup without deleting existing menu data or orders. Chef push registration requires HTTPS in production (localhost is allowed during development). Open `/admin`, log in, and allow notifications when prompted on every device that should receive new-order alerts.
