# Frame School privileged access

Routine `ADMIN` grants are synchronized only from existing confirmed accounts in `config/admins.json`. Keep candidates in `pending` until their email ownership is verified, then move the exact email to `confirmed`.

The web interface follows this matrix:

- `ADMIN` moderates users, content, reviews, support, and announcements;
- `DEVELOPER` can grant `ADMIN` and manage manual Premium overrides;
- `OWNER` can grant `DEVELOPER`;
- the web interface never grants or removes `OWNER`.

For emergency `OWNER` or `DEVELOPER` recovery, follow `OWNER_ROLE_INSTRUCTIONS.md`. Never leave `ADMIN_GRANT_*` values in Layero after the command finishes.
