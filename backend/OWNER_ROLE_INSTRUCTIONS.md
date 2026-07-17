# Emergency Owner and Developer access

The web interface can never grant or remove `OWNER`. Use this procedure from the backend directory only.

1. Register the target account normally. The script does not create an account unless that behavior is explicitly enabled.
2. Set temporary environment variables:

```text
ADMIN_GRANT_EMAIL=owner@example.com
ADMIN_GRANT_ROLES=OWNER,DEVELOPER,ADMIN
ADMIN_GRANT_CONFIRM=GRANT:owner@example.com:OWNER+DEVELOPER+ADMIN
```

3. Run `npm run admin:grant`.
4. Confirm the JSON output and sign in again. Existing sessions are invalidated.
5. Remove all `ADMIN_GRANT_*` variables from Layero immediately.

To create a missing emergency account, also set `ADMIN_GRANT_CREATE=true`, `ADMIN_GRANT_USERNAME`, and a unique `ADMIN_GRANT_PASSWORD` of at least 12 characters. Prefer normal registration so Turnstile and email ownership are checked.

The operation is idempotent and writes `role.emergency_grant` to `AuditLog`.
