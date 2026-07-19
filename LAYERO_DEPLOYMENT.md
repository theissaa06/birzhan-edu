# Layero deployment checklist

## Required configuration

Backend secrets: `DATABASE_URL`, `JWT_SECRET`, SMTP credentials, Turnstile secret, R2 credentials, Google/Apple/Telegram/VK keys, `OAUTH_REDIRECT_BASE_URL`, TipTopPay secret, and CloudPayments secret. Frontend variables contain only Turnstile site key and KZ/RU public payment IDs.

Provider callback URLs use `https://<production-origin>/api/auth/oauth/<provider>/callback`. Telegram uses the production hostname configured for the bot.

For the current production service, configure these backend-only Google values in Layero:

```text
FRONTEND_URL=https://theissaa-birzhan-edu.preview.layero.ru
OAUTH_REDIRECT_BASE_URL=https://theissaa-birzhan-edu.preview.layero.ru
GOOGLE_CLIENT_ID=<Google OAuth web client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth web client secret>
```

The exact authorized redirect URI in Google Cloud Console is:

```text
https://theissaa-birzhan-edu.preview.layero.ru/api/auth/oauth/google/callback
```

Use a Web application OAuth client. The production redirect must match exactly, including HTTPS, path, and the absence of a trailing slash. Add the production origin to the OAuth consent screen as an authorised domain/origin when Google requests it.

The remaining provider values are backend-only Layero variables:

```text
# Sign in with Apple: Services ID + Sign in with Apple private key
APPLE_CLIENT_ID=<Services ID, for example school.frame.web>
APPLE_TEAM_ID=<Apple Developer Team ID>
APPLE_KEY_ID=<Sign in with Apple key ID>
APPLE_PRIVATE_KEY=<complete .p8 private key with newlines encoded as \n>

# Telegram Login Widget: create the bot in BotFather and run /setdomain
TELEGRAM_BOT_NAME=<bot username without @>
TELEGRAM_BOT_TOKEN=<BotFather token>

# VK ID web application
VK_CLIENT_ID=<VK application ID>
VK_CLIENT_SECRET=<VK application secret>
```

Register these production callback/domain values in the provider consoles:

```text
Apple domain: theissaa-birzhan-edu.preview.layero.ru
Apple return URL: https://theissaa-birzhan-edu.preview.layero.ru/api/auth/oauth/apple/callback
Telegram /setdomain: theissaa-birzhan-edu.preview.layero.ru
VK redirect URI: https://theissaa-birzhan-edu.preview.layero.ru/api/auth/oauth/vk/callback
```

Creating provider credentials requires the project owner's authenticated developer accounts and acceptance of each provider's terms. Do not paste secrets into chat, screenshots, Git, frontend variables, or build logs. Enter them directly into Layero's secret environment fields, redeploy, and verify that `/api/auth/oauth/providers` returns `configured: true` for every provider without returning any secret value.

The feature preview needs its own exact origin and callback entry. In production, redirect providers remain disabled unless their credentials, `FRONTEND_URL`, and either `OAUTH_REDIRECT_BASE_URL` or `PUBLIC_BACKEND_URL` are all present. Never add provider secrets to `VITE_*`, frontend files, Git, or build artifacts. Verify readiness through `GET /api/auth/oauth/providers`; then perform a real provider login and confirm the one-use `/exchange` flow. Do not auto-link an existing account only because the provider returned the same email.

Payment variables are split by trust boundary: `VITE_TIPTOPPAY_KZ_PUBLIC_ID` and `VITE_CLOUDPAYMENTS_RU_PUBLIC_ID` are frontend build variables; `TIPTOPPAY_API_SECRET` and `CLOUDPAYMENTS_API_SECRET` are backend-only. Use sandbox credentials for QA.

## Database safety

Before the first production deployment, make a PostgreSQL backup from the Layero database connection:

```text
pg_dump --format=custom --no-owner --file=frame-school-before-platform-foundation.dump "$DATABASE_URL"
```

Verify the backup with `pg_restore --list`. Then deploy migration `20260717150000_platform_foundation`. It is an expand/backfill migration and intentionally preserves legacy role, ban, Premium, and certificate fields. A contract migration must be a later reviewed release after row-count and backfill checks.

## Release gates

Run frontend lint/typecheck/test/build and backend lint/typecheck/test/build. Push the feature branch, verify Layero preview, then fast-forward or merge to `main`. Confirm the deployed SHA, migration status, `/health`, critical browser routes, console/network errors, and post-deploy latency before closing the release.

Do not run a real payment during QA. Use provider sandbox/test mode; a charging operation requires a separate explicit confirmation.
