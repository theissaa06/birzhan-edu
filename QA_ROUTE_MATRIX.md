# Frame School QA matrix

| Route / flow | Role | Server API | Expected states | Mobile / reduced motion | Automated | Browser preview | Browser production |
|---|---|---|---|---|---|---|---|
| `/register` | Guest | `POST /api/auth/register`, OAuth providers | form, Turnstile, four OAuth buttons, errors | 390×844 passed; no overflow; menu passed | lint/typecheck/test/build passed | form + four buttons passed; providers blocked by missing keys | form + four buttons + mobile passed; providers blocked by missing keys |
| `/login` | Guest | login, reactivate, OAuth exchange | password, deactivated recovery, one-use OAuth code | desktop passed; mobile host cold-start timed out on preview | lint/typecheck/test/build passed | form + four disabled provider buttons passed | form + four disabled provider buttons passed |
| Password reset | Guest | forgot/verify/reset | unknown email, OAuth-only, expired/reused code | required | Turnstile service tests passed | blocked: Turnstile key and real mailbox absent | blocked: Turnstile key and real mailbox absent |
| `/courses` and lessons | Guest/User/Premium | courses, lessons, progress, submissions | loading, empty, progress, completion | public catalog has no overflow | lint/typecheck/build passed | public catalog passed; authenticated progress not exercised | public catalog passed; authenticated progress not exercised |
| `/profile` | User | users/me, OAuth link/unlink, deactivate | linked services, password, farewell after success | required | auth storage tests passed | blocked: no authorised test-user credentials | blocked: no authorised test-user credentials |
| `/certificates` | User | certificates/me | empty/list | required | typecheck/build passed | blocked: no authorised test-user credentials | blocked: no authorised test-user credentials |
| `/certificate/:code` | Public | public certificate + local QR | active, revoked, not found, print | required | typecheck/build passed | not exercised: no issued certificate fixture | not exercised: no issued certificate fixture |
| `/reviews` | Guest/User | reviews/comments | empty, one editable review, comments, official reply | no overflow | typecheck/build passed | public empty state passed; write flow not exercised | public empty state passed; write flow not exercised |
| `/webinars`, `/jobs`, `/media`, `/find-employee` | Public | dedicated APIs | real data or honest empty state | no overflow | typecheck/build passed | passed; honest empty states | passed; honest empty states |
| `/admin/users` | Admin/Developer/Owner | roles, bans, Premium | role matrix, protected users, confirmation reasons | required | access matrix tests passed | blocked: no confirmed OWNER/DEVELOPER account | blocked: no confirmed OWNER/DEVELOPER account |
| `/admin/bans` | Admin+ | bans registry | active/expired/revoked history | required | access matrix tests passed | blocked: no confirmed privileged account | blocked: no confirmed privileged account |
| `/admin/reviews` | Admin+ | moderation/official reply | hide/publish/single official reply | required | syntax/typecheck passed | blocked: no confirmed privileged account | blocked: no confirmed privileged account |
| `/admin/announcements` | Admin+ | announcements | audience/date/create/delete | required | syntax/typecheck passed | blocked: no confirmed privileged account | blocked: no confirmed privileged account |
| `/admin/support` | Admin+ | support/reply | session-bound author, protected reply | public form has no overflow | syntax/typecheck passed | public support page passed; admin flow blocked | public support page passed; admin flow blocked |
| `/premium` | User | regional config/status/webhooks | KZ/RU, missing key, invalid/replay webhook | required | syntax tests passed | blocked: KZ/RU sandbox keys absent | blocked: KZ/RU sandbox keys absent |

Browser smoke was recorded on 2026-07-17 after Layero reported Ready. External OAuth and payment rows cannot be marked passed without real provider credentials and sandbox accounts. Production console inspection returned no warnings or errors on the exercised public routes.
