# Frame School Admin Access

Use this only for owner/developer recovery or initial production setup.

1. Set backend env variables:

```bash
ADMIN_GRANT_EMAIL=admin@birzhan-edu.com
ADMIN_GRANT_USERNAME=Frame School Admin
ADMIN_GRANT_PASSWORD=<strong temporary password>
ADMIN_GRANT_BADGES=ADMIN,OWNER,DEVELOPER
```

2. Run from `backend`:

```bash
npm run admin:grant
```

3. Log in once, change the password, then remove `ADMIN_GRANT_PASSWORD` from the environment.

Notes:

- `OWNER` and `DEVELOPER` accounts cannot be blocked or deleted by another admin.
- The script never removes Premium, progress, submissions, bonuses, or certificates.
- If `ADMIN_GRANT_PASSWORD` is omitted for an existing user, only role/badges are repaired.
