# Frame School QA matrix

| Route / flow | Role | Server API | Expected states | Mobile / reduced motion | Automated | Browser preview | Browser production |
|---|---|---|---|---|---|---|---|
| `/register` | Guest | `POST /api/auth/register`, OAuth providers | form, Turnstile, four OAuth buttons, errors | required | typecheck/build | pending deploy | pending deploy |
| `/login` | Guest | login, reactivate, OAuth exchange | password, deactivated recovery, one-use OAuth code | required | typecheck/build | pending deploy | pending deploy |
| Password reset | Guest | forgot/verify/reset | unknown email, OAuth-only, expired/reused code | required | Turnstile tests | pending deploy | pending deploy |
| `/courses` and lessons | Guest/User/Premium | courses, lessons, progress, submissions | loading, empty, progress, completion | required | syntax/typecheck | pending deploy | pending deploy |
| `/profile` | User | users/me, OAuth link/unlink, deactivate | linked services, password, farewell after success | required | auth storage tests | pending deploy | pending deploy |
| `/certificates` | User | certificates/me | empty/list | required | typecheck | pending deploy | pending deploy |
| `/certificate/:code` | Public | public certificate + local QR | active, revoked, not found, print | required | syntax/typecheck | pending deploy | pending deploy |
| `/reviews` | Guest/User | reviews/comments | empty, one editable review, comments, official reply | required | typecheck | pending deploy | pending deploy |
| `/webinars`, `/jobs`, `/media`, `/find-employee` | Public | dedicated APIs | real data or honest empty state | required | typecheck | pending deploy | pending deploy |
| `/admin/users` | Admin/Developer/Owner | roles, bans, Premium | role matrix, protected users, confirmation reasons | required | access matrix tests | pending deploy | pending deploy |
| `/admin/bans` | Admin+ | bans registry | active/expired/revoked history | required | access matrix tests | pending deploy | pending deploy |
| `/admin/reviews` | Admin+ | moderation/official reply | hide/publish/single official reply | required | syntax/typecheck | pending deploy | pending deploy |
| `/admin/announcements` | Admin+ | announcements | audience/date/create/delete | required | syntax/typecheck | pending deploy | pending deploy |
| `/admin/support` | Admin+ | support/reply | session-bound author, protected reply | required | syntax/typecheck | pending deploy | pending deploy |
| `/premium` | User | regional config/status/webhooks | KZ/RU, missing key, invalid/replay webhook | required | syntax tests | pending sandbox keys | pending sandbox keys |

Browser columns are updated only after the exact deployed commit is Ready. External OAuth and payment rows cannot be marked passed without real provider credentials and sandbox accounts.
