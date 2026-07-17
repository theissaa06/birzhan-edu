# Layero deployment checklist

## Required configuration

Backend secrets: `DATABASE_URL`, `JWT_SECRET`, SMTP credentials, Turnstile secret, R2 credentials, Google/Apple/Telegram/VK keys, `OAUTH_REDIRECT_BASE_URL`, TipTopPay secret, and CloudPayments secret. Frontend variables contain only Turnstile site key and KZ/RU public payment IDs.

Provider callback URLs use `https://<production-origin>/api/auth/oauth/<provider>/callback`. Telegram uses the production hostname configured for the bot.

## Database safety

Before the first production deployment, make a PostgreSQL backup from the Layero database connection:

```text
pg_dump --format=custom --no-owner --file=frame-school-before-platform-foundation.dump "$DATABASE_URL"
```

Verify the backup with `pg_restore --list`. Then deploy migration `20260717150000_platform_foundation`. It is an expand/backfill migration and intentionally preserves legacy role, ban, Premium, and certificate fields. A contract migration must be a later reviewed release after row-count and backfill checks.

## Release gates

Run frontend lint/typecheck/test/build and backend lint/typecheck/test/build. Push the feature branch, verify Layero preview, then fast-forward or merge to `main`. Confirm the deployed SHA, migration status, `/health`, critical browser routes, console/network errors, and post-deploy latency before closing the release.

Do not run a real payment during QA. Use provider sandbox/test mode; a charging operation requires a separate explicit confirmation.
