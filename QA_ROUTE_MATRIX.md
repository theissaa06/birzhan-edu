# Frame School QA matrix

| Route / flow | Role | Server API | Expected states | Mobile / reduced motion | Automated | Browser preview | Browser production |
|---|---|---|---|---|---|---|---|
| `/register` | Guest | `POST /api/auth/register`, OAuth providers | form, Turnstile, four OAuth buttons, errors | 390×844 passed; no overflow; menu passed | four-provider readiness UI test + lint/typecheck/test/build passed | form + four buttons passed; Google production credentials configured in Layero | pending new deploy: Google live flow; Apple/Telegram/VK await provider credentials |
| `/login` | Guest | login, reactivate, OAuth exchange | password, deactivated recovery, one-use OAuth code | desktop passed; mobile host cold-start timed out on preview | atomic exchange/replay + provider readiness tests passed | form + four provider states passed | pending new deploy: Google live flow; Apple/Telegram/VK await provider credentials |
| Password reset | Guest | forgot/verify/reset | unknown email, OAuth-only, expired/reused code | required | Turnstile service tests passed | blocked: Turnstile key and real mailbox absent | blocked: Turnstile key and real mailbox absent |
| `/courses` and lessons | Guest/User/Premium | courses, lessons, progress, submissions | loading, empty, progress, completion | public catalog has no overflow | lint/typecheck/build passed | public catalog passed; authenticated progress not exercised | public catalog passed; authenticated progress not exercised |
| `/profile` | User | users/me, OAuth link/unlink, deactivate | linked services, password, farewell after success | required | auth storage tests passed | blocked: no authorised test-user credentials | blocked: no authorised test-user credentials |
| `/certificates` | User | certificates/me | empty/list | required | typecheck/build passed | blocked: no authorised test-user credentials | blocked: no authorised test-user credentials |
| `/certificate/:code` | Public | public certificate + local QR | active, revoked, not found, print | required | typecheck/build passed | not exercised: no issued certificate fixture | not exercised: no issued certificate fixture |
| `/reviews` | Guest/User | reviews/comments | empty, one editable review, comments, official reply | no overflow | persistence, fresh-list confirmation, comments/reply serialization tests passed | one persisted review and official reply visible | one persisted review and official reply visible after `574bdfa` |
| `/webinars`, `/jobs`, `/media`, `/find-employee` | Public | dedicated APIs | real data or honest empty state | no overflow | typecheck/build passed | passed; honest empty states | passed; honest empty states |
| `/admin/users` | Admin/Developer/Owner | roles, bans, Premium | role matrix, protected users, confirmation reasons | required | access matrix tests passed | blocked: no confirmed OWNER/DEVELOPER account | blocked: no confirmed OWNER/DEVELOPER account |
| `/admin/bans` | Admin+ | bans registry | active/expired/revoked history | required | access matrix tests passed | blocked: no confirmed privileged account | blocked: no confirmed privileged account |
| `/admin/reviews` | Admin/Developer/Owner | moderation/official reply | form, create/edit one reply, backend role label, notification, audit | required | frontend confirmed-response tests + backend RBAC/notification/audit/public-list test passed | authenticated Browser flow requires a staff session | authenticated Browser flow requires a staff session |
| `/admin/announcements` | Admin+ | announcements | audience/date/create/delete | required | syntax/typecheck passed | blocked: no confirmed privileged account | blocked: no confirmed privileged account |
| `/admin/support` | Admin+ | support/reply | session-bound author, protected reply | public form has no overflow | syntax/typecheck passed | public support page passed; admin flow blocked | public support page passed; admin flow blocked |
| `/premium` | User | regional config/status/webhooks | KZ/RU, missing key, invalid/replay webhook | required | syntax tests passed | blocked: KZ/RU sandbox keys absent | blocked: KZ/RU sandbox keys absent |

## Regression pass for TZ (22), 2026-07-19

| Defect | Automated evidence | Local production build | Layero preview | Layero production |
|---|---|---|---|---|
| Premium SVG expanded into black circles | frontend lint/typecheck/test/build passed | passed: 18–25 px, `fill: none`, inherited stroke; pictographic teacher emoji replaced | passed on `574bdfa` | passed on `574bdfa` |
| Admin access check treated backend failure as invalid JWT | backend auth middleware + frontend retry tests passed | fail-closed 503 state and working retry passed | passed on `574bdfa` | anonymous guard passed; service-failure branch covered automatically |
| Google button could activate with an incomplete production redirect setup | OAuth production-configuration test passed; secret absent from provider response | exact production origin/callback configured; secret stored only in Layero backend env; Google audience is In production | pending new deploy | pending live callback smoke |
| Review success toast could disagree with the public list | backend create/list/update/failure test and frontend confirmed-list/false-success tests passed | production API exposes 1 persisted review; fresh-list confirmation added | passed on `574bdfa` | passed on `574bdfa`; persisted review remains after fresh navigation |

## Regression pass for TZ (23), 2026-07-19

| Defect / flow | Automated evidence | Layero configuration | Browser preview | Browser production |
|---|---|---|---|---|
| Admin review button did not provide a reliable official-reply workflow | UI open/create/error-confirmation tests; backend ADMIN/DEVELOPER RBAC, single upsert, role label, notification, audit, public serialization and failure test | no new secret required | pending new deploy | pending new deploy; authenticated staff session required for the write |
| OAuth buttons need real Google/Apple/Telegram/VK credentials | frontend four-button readiness tests; backend complete/incomplete configuration, exact Google callback with state/nonce/PKCE, signed Google ID token verification and atomic one-use exchange | `OAUTH_REDIRECT_BASE_URL`, Google Client ID/secret added to Layero; Google app published for External users | pending new deploy | Google pending live callback smoke; Apple needs Developer Program credentials, Telegram needs BotFather account, VK console is unavailable to Browser automation |

Browser smoke was recorded on 2026-07-17 after Layero reported Ready. Google production OAuth configuration was completed on 2026-07-19 and awaits the new deploy smoke. Apple, Telegram, VK and payment rows cannot be marked passed without their provider credentials and sandbox accounts. Production console inspection returned no warnings or errors on the exercised public routes.
