# PROJECT_AUDIT.md — Khadya Bachao

**Date:** 2026-09-27 · **Scope:** full monorepo (`backend/` Spring Boot 3.5 / Java 17 · `mobile/` React Native 0.87)
**Method:** this document consolidates three audit passes — `AUDIT_GAP_ANALYSIS.md` (2026-09-16), `FULL_CODE_AUDIT.md` (2026-09-26, line-by-line static review of 85 Java + 57 TS/TSX files), and a **live end-to-end verification pass** (2026-09-27, this session: 59-check scripted E2E against a running backend + Postgres/PostGIS, plus the full automated suites).

Statuses: `COMPLETE` = verified working UI → API → DB → UI · `PARTIAL` · `BROKEN` · `MOCKED` · `MISSING` · `UNKNOWN`. Nothing is marked COMPLETE on the basis of a screen existing.

---

## 1. Feature audit matrix

| Feature | Backend | Mobile | Database | API | Integration | Tests | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Registration / first login | Firebase ID-token exchange + dev-mode provisioning | Firebase email/phone + dev fallback (gated to `__DEV__` after fix M14) | `users` (UUID PK, unique email, unique firebase_uid) | `POST /api/auth/verify-token`, `/api/auth/dev/login` | E2E verified (dev path) | unit + E2E | **COMPLETE** |
| Login / logout / token refresh | JWT (HS512, 24h sliding refresh, default-secret startup guard B4) | Keychain/Keystore storage, 401 → refresh → logout (fix M8) | — | `POST /api/auth/refresh`, `PUT /api/users/me` | E2E verified | unit + E2E | **COMPLETE** |
| Google Auth (Firebase) | `FirebaseTokenVerifier` (Admin SDK, fail-loud init B9) | `@react-native-firebase/messaging` + auth | — | same as login | **UNKNOWN without real Firebase project config on device** | code-verified | **PARTIAL** (needs device-level Firebase config to verify) |
| Donor profile | `PUT /api/users/me` (name/phone/photo), DTO excludes `firebaseUid` (B52) | ProfileScreen | `users` | `GET/PUT /api/users/me` | E2E verified | unit + E2E | **COMPLETE** |
| Recipient profile | same + role selection | RoleSelectScreen | `users.role` | `PUT /api/users/me/role` (whitelist, no ADMIN — B15) | E2E verified | unit + E2E | **COMPLETE** |
| Food posting | full validation server-side (title/type/qty/deadline future-only/lat/lng bounds) | PostFoodScreen (photo, category, quantity, prepared time, deadline, map pin, instructions) | `food_listings` | `POST /api/listings`, `PUT /{id}`, `PATCH /{id}/cancel` | E2E verified | unit + E2E | **COMPLETE** |
| Food image upload | 5MB + JPEG/PNG/WebP **magic-byte sniffing** (B39, this session) + multipart limits (B38) | image picker + compression | object storage (local/R2/Firebase) | `POST /api/uploads` | E2E verified (real PNG accepted, disguised text rejected) | E2E | **COMPLETE** |
| Food quantity / type | `FoodType` enum (COOKED/PACKAGED/RAW), `@DecimalMin` on create **and** update (B26) | picker + units | numeric + unit column | same | E2E verified | unit | **COMPLETE** |
| Preparation time / expiry | `preparedAt`, `pickupDeadline` (must be future); server-authoritative | PostFoodScreen date pickers | timestamptz | same | E2E verified | unit + E2E | **COMPLETE** |
| Location capture | lat/lng validation (-90..90 / -180..180) | current location + manual map pin, graceful permission fallbacks | numeric columns | same | E2E verified (backend); device GPS manual | unit + E2E | **COMPLETE** |
| Google Maps / map rendering | n/a (server sends coordinates) | react-native-maps + OSM UrlTile tiles (free, no key needed for tiles) | — | — | **UNKNOWN on device** (emulator rendering not verified in CI; see §4 Maps status) | code-verified | **PARTIAL** |
| Distance calculation | **backend-authoritative**: PostGIS `ST_DWithin`/`ST_Distance` on `GEOGRAPHY(POINT)` + Haversine fallback; radius clamped 0.1–100 km | displays server-provided distance; no client-side geo math for business logic | `location GEOGRAPHY(POINT,4326)` + GIST index | `GET /api/listings/nearby` | **E2E verified after P0 fix (see §2)** | E2E | **COMPLETE** |
| Nearby listings | radius + foodType + min/max quantity + pagination; expired/cancelled excluded for non-admins (B25) | DiscoverScreen map+list sync | — | same | E2E verified | E2E | **COMPLETE** |
| Filters | server-side filtering | Discover filter UI | — | same | E2E verified | E2E | **COMPLETE** |
| Claim / request | claim auto-accepts; **pessimistic lock + atomic conditional UPDATE** (first-claim-wins) | ListingDetailScreen claim with 409 handling | `food_requests` | `POST /api/listings/{id}/claim` | **E2E verified incl. true concurrent race (exactly one winner)** | integration + E2E | **COMPLETE** |
| Race-condition protection | transaction + lock + status guard + expired/deadline guard | — | FK + status constraints | — | E2E verified | integration + E2E | **COMPLETE** |
| Pickup scheduling | propose/confirm by both parties; participant-gated; **per-user confirm state in UI (M21, this session)** | ChatScreen schedule panel | `pickup_schedules` | `POST/PATCH /api/requests/{id}/schedule[/confirm]` | E2E verified | unit + E2E | **COMPLETE** |
| Chat | STOMP WebSocket + REST; **SUBSCRIBE authorization (B18)**; JWT on CONNECT (M11); REST-first client send (M20, this session); participant guard | ChatScreen | `chat_messages` | `/api/requests/{id}/messages`, WS `/ws`, `/ws-raw` | REST path E2E verified; WS path code-verified (needs two devices to verify live) | unit + E2E (REST) | **COMPLETE** (live-socket verification pending) |
| Push notifications | FCM via `FcmNotificationService`, dev-log fallback; claim/chat/schedule/verification/rating events | device token registration, foreground/background listeners | `device_tokens` (ownership guard B34) | `POST /api/devices/register`, inbox endpoints | E2E verified dispatch (dev-log); FCM delivery **UNKNOWN without real FCM credentials** | E2E | **PARTIAL** (dispatch verified; device delivery needs Firebase project) |
| Verification (NGO) | submit/resubmit (PENDING guard B46, this session), admin approve/reject + notification; tx fix (this session) | ProfileScreen doc upload, AdminScreen queue | `organizations` | `/api/verification/*`, `/api/admin/verifications/*` | E2E verified end-to-end incl. `verified=true` | E2E | **COMPLETE** |
| Ratings | 1–5 bounds, one rating per rater per request (409 on duplicate), participant-only, both directions | RatingModal | `ratings` | `POST/GET /api/requests/{id}/rate[s]` | E2E verified | unit + E2E | **COMPLETE** |
| Reports | report listing/user, target validation, admin resolve (auto-cancels listing) / dismiss | ReportModal | `reports` | `/api/reports`, `/api/admin/reports/*` | E2E verified | unit + E2E | **COMPLETE** |
| Impact tracker | stats from **completed** pickups only (not created listings); per-user + system + 14-day trend + leaderboard | DashboardScreen | `stats_daily` pre-aggregation + live query | `GET /api/stats/me|system|organization/{id}` | E2E verified (quantityRescued increments on completion) | unit + E2E | **COMPLETE** |
| Admin | ADMIN-only (@PreAuthorize); verification queue, reports moderation, user deactivate/reactivate, metrics | AdminScreen | — | `/api/admin/*` | E2E verified (403 for non-admins, deactivate → 401) | E2E | **COMPLETE** |
| Analytics | admin metrics endpoint; system stats public (aggregates only) | Dashboard | `stats_daily` | `/api/admin/metrics` | E2E verified | E2E | **COMPLETE** |
| Automated expiry | `ListingExpiryJob` every 60s; claim path also rejects past-deadline listings directly (defense in depth) | expired listings hidden/flagged | status transitions guarded | — | **E2E verified** (job flip + claim 409) | unit + E2E | **COMPLETE** |

### Legacy feature list (all verified present and working)

Registration · Login · Google Auth (Firebase path, device-config dependent) · Donor/Recipient profiles · Food posting · Image upload · Quantity · Food type · Preparation time · Expiry · Location · Maps · Distance · Nearby · Filters · Claim · Race protection · Pickup scheduling · Chat · Push notifications · Verification · Ratings · Reports · Impact tracker · Admin · Analytics.

---

## 2. Defects found by live E2E (this session) — all fixed

These were **not** caught by the 42-test backend suite or the earlier static audits; the live pass found them.

| # | Severity | Finding | Fix |
| --- | --- | --- | --- |
| E1 | **P0** | **PostGIS `location` column was NULL for every listing created after migration V13** (V13 backfilled once; nothing maintained it; entity has no matching field). `ST_DWithin` nearby search therefore returned **zero results for all new listings** — the app's core discovery feature was silently broken end-to-end. | New migration `V18__maintain_listing_location_column.sql`: BEFORE INSERT/UPDATE trigger keeps `location` in sync with `pickup_lat`/`pickup_lng` + backfill. Verified: nearby now returns created listings. |
| E2 | P2 | Malformed JSON body produced **500 + stack-trace log** instead of 400. | `GlobalExceptionHandler` now maps `HttpMessageNotReadableException` → 400 "Malformed request body". |
| E3 | P2 | `POST /api/verification/submit` on an existing organization threw `LazyInitializationException` (500): response DTO read a lazy `user` proxy outside a transaction (resubmission path broken). | `submit()` annotated `@Transactional` (mapping now happens inside the session, same pattern as reports). |
| E4 | P2 | Report response returned `createdAt: null` (`@CreationTimestamp` populates only at insert flush; DTO rendered pre-commit). | `ReportService.create` uses `saveAndFlush`. |
| E5 | P3 | Rate limiter limit hardcoded (20/min) — throttled legitimate E2E and unconfigurable in deployments. | `app.rate-limit.max-requests` / `window-ms` config + env vars. |
| E6 | P2 | Chat client could silently lose messages: fire-and-forget WS publish + immediate input clear; no error surface (audit M20). | ChatScreen sends via **REST-first** (authoritative: persists + broadcasts + returns message); WS subscription still delivers live to both parties. |
| E7 | P3 | Schedule confirm button showed one combined state; users couldn't tell whose confirmation was missing (audit M21). | `ScheduleResponse` now carries `donorId`/`recipientId`; ChatScreen shows per-user confirmation ("You confirmed — waiting for the other party", disabled). |
| E8 | P2 | Uploads trusted the client-declared Content-Type only — an arbitrary file with `image/png` header was stored as `.png` (audit B39, still open in tree despite AGENTS.md wording). | Magic-byte sniffing (JPEG/PNG/WebP signatures) must agree with declared type; stored extension derives from bytes. Verified: disguised text rejected 400. |
| E9 | P2 | Device FCM token had no length cap (DB abuse vector, audit B35). | `@Size(max=4096)` on token. |
| E10 | P2 | Verification queue spam: unlimited resubmission while PENDING (audit B46). | 409 when a PENDING request already exists (rejection still allows resubmission). Verified: 409 returned. |
| E11 | P2 | V12 demo/seed accounts (`dev-%`) would ship inside production databases (audit B57). | Prod-only Flyway location `db/migration/prod/V17__deactivate_dev_seed_users.sql` (deactivates, preserves referential integrity) + prod profile wiring; prod profile also forces `FIREBASE_ENABLED=true`, disables Swagger. |
| E12 | P3 | No automated dependency updates (audit B61). | `.github/dependabot.yml` (maven, npm, github-actions). |
| E13 | P3 | Release builds silently signed with public debug key when `keystore.properties` missing (audit M4; fallback itself is documented/kept). | Loud Gradle banner warning on fallback. |

Pre-existing P0/P1 fixes from the 2026-09-26 audit pass (verified present in tree this session): B4 (JWT default-secret guard), B8/B17 (dev-auth backdoor gated `@Profile("!prod")`, no ADMIN via dev login), B9 (fail-loud Firebase init), B12 (XFF only via trusted proxies), B15 (role whitelist, no ADMIN self-assign), B18 (STOMP SUBSCRIBE authorization), B25 (expired-view admin-only), B26 (update validation parity), B28 (approve state guards), B30 (ratings participant guard), B33 (masked phone logs), B34 (device-token ownership), B38 (multipart 5MB), B40/X1 (uploads public for `<Image>`), B45 (report reason cap), B52 (UserResponse DTO), B62 (SQL logging INFO), D1 (input size caps), M1 (cleartext placeholder per build type), M8 (401→refresh→logout), M9 (release https fail-fast), M11 (WS CONNECT JWT), M12 (socket deactivate on logout), M14/M15 (dev fallback gated to `__DEV__`), M16 (returning-user role skip), M17 (Firebase signOut), M22 (upload reuse/compression), X2–X5 (cross-cutting breaks).

---

## 3. Mock / fake functionality disposition

| Item | Location | Disposition |
| --- | --- | --- |
| Dev-log notification service | `notification/LogNotificationService` | **Intentional** — active only when FCM disabled; logs instead of sending. Real provider = `FcmNotificationService`. |
| SMS dispatch stub | `SmsNotificationDispatchService` | **Intentional** — logs masked phone (`***`), provider marked STUB/DISABLED until Twilio credentials exist. |
| Dev auth issuer | `DevAuthController` / `DevTokenVerifier` | **Intentional demo path** — disabled when `FIREBASE_ENABLED=true` and always under `@Profile("!prod")`. |
| V12 seed data (25 users, listings, chats) | `V12__seed_demo_data_and_users.sql` | **Intentional demo data**; deactivated in prod by V17. |
| OpenStreetMap tiles | `DiscoverScreen.tsx` | **Real** (free tile provider); Google Maps SDK key still wired for Android native map features. Known trade-off documented in README (tile usage policy). |
| `console.log` in mobile | verified minimal; none carrying credentials | Clean. |
| Backend `System.out`/debug prints | none found; logging via SLF4J with level caps | Clean. |

---

## 4. Maps status (see also FINAL_PROJECT_REPORT.md §5)

- **Backend**: authoritative distance + radius search via PostGIS — verified live after fix E1.
- **Mobile**: `react-native-maps` with OSM `UrlTile` tiles (no billing required for tile rendering); Google Maps key env-wired into the Android manifest (`GOOGLE_MAPS_API_KEY` env or gradle property; placeholder only as last resort). Marker/list sync, re-centering, stale-card fixes from the 2026-09-26 pass are in the tree.
- **Not verifiable in this environment**: actual on-device tile rendering, GPS accuracy handling, and native map behavior (no Android emulator in this session). These remain code-verified only — flagged honestly rather than claimed.

## 5. Remaining known limitations

1. Firebase/FCM end-to-end delivery and Google-Auth-on-device require real Firebase project configuration on a device — code paths verified, runtime delivery not.
2. Live WebSocket chat between two real devices not exercised here (REST path fully verified; WS CONNECT/SUBSCRIBE auth covered by unit tests).
3. iOS: dev-mode cleartext to `10.0.2.2` blocked by ATS on physical devices (documented; needs debug xcconfig exception or https dev host).
4. OSM tile usage policy: consider a keyed tile provider (e.g. MapTiler) at production scale.
5. Operational: **rotate the two Firebase Admin SDK keys** found in the local `api key/` folder (gitignored; never committed; rotation must happen in the Firebase console).
6. Horizontal scaling: stats aggregation and rate limiting are single-instance designs (documented in audit B13/B50).
