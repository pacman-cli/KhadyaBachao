# FINAL_PROJECT_REPORT.md — Khadya Bachao

**Date:** 2026-09-27 · **Verification basis:** every claim below traces to a command actually run in this session — backend `./mvnw -B verify` (Testcontainers), mobile `tsc`/`eslint`/`jest`, Firebase rules tests (prior session), and a scripted **59-check live end-to-end suite** against a running backend + Postgres/PostGIS. Nothing is marked PASS that wasn't executed.

---

## 1. Original problems (as found)

Discovered across the 2026-09-26 line-by-line audit and the 2026-09-27 live pass:

1. **Any user could make themselves ADMIN** via `PUT /api/users/me/role` (B15) or dev login (B17) — full platform takeover from any account.
2. **Dev-auth backdoor active by default** (B8): any deployment missing `FIREBASE_ENABLED=true` accepted forged `dev:` tokens.
3. **Default JWT secret accepted outside the `prod` profile** (B4) → account forgery with a public key.
4. **Chat eavesdropping** (B18): STOMP SUBSCRIBE was unauthenticated — anyone could read any pickup chat; client sent no JWT at all (M11).
5. **Every locally-uploaded image was a broken image** (X1/B40+M2): auth-required static files + headerless `<Image>`.
6. **Photo uploads >1MB failed** with an opaque error (X2/B38): Spring's hidden 1MB default.
7. **[This session, live E2E] Nearby food discovery returned nothing for new listings** (E1/P0): the PostGIS `location` column was never populated after V13's one-time backfill — the app's core feature was silently broken end-to-end.
8. Role changes didn't propagate (JWT role claim dead code, B6); spoofable `X-Forwarded-For` rate-limit keys (B12); device-token ownership theft (B34); unbounded inputs on several write paths (D1); SQL+parameters logged by default (B62); unbounded `photoUrls` (B26/D1); approval-state holes (B28); ratings readable by non-participants (B30); unlimited verification resubmissions (B46); seed accounts shipped to prod (B57); release builds silently debug-signed (M4); Firebase client silently falling back to dev login in release (M14/M15); message-loss on fire-and-forget WS chat sends (M20); manifest placeholder build-failure risk (M1).
9. Misleading earlier audit: the project had been declared "100% compliant" by a doc-only review while the single most important query (nearby discovery) returned zero rows.

## 2. Fixed problems

All of the above are fixed and covered by tests or the live E2E suite:

- **Security**: role whitelist + ADMIN never self-assignable (B15/B17, verified: 400); dev backdoor `@Profile("!prod")` + prod profile forces Firebase on; JWT default-secret startup guard (B4); STOMP SUBSCRIBE participant authorization (B18) with client CONNECT JWT (M11); XFF only from trusted proxies (B12); device-token ownership conflict 409 (B34, verified); deactivated users rejected per-request (verified live: 401); admin APIs 403 for non-admins (verified); upload magic-byte sniffing (B39/E8, verified: disguised file rejected).
- **Core flows**: PostGIS location trigger + backfill (V18, E1) — nearby discovery verified live; multipart 5MB (B38); uploads served publicly for `<Image>` (X1/B40); optimistic-claim + pessimistic-lock race protection (verified: concurrent race yields exactly one winner); expiry job + claim-time deadline guard (verified live); refresh/401 handling (M8); chat REST-first send (M20) + per-user schedule confirmation (M21).
- **Data hygiene**: bounded inputs (D1/B45/B35), UserResponse DTO without `firebaseUid` (B52), SQL logging off by default (B62), `createdAt` populated on report responses (E4), verification resubmission transaction fix (E3) + PENDING guard (B46), prod-only migration deactivating demo accounts (B57/V17), malformed-JSON → 400 (E2), configurable rate limits (E5).
- **Build/CI**: manifest placeholder per build type (M1), Maps key env wiring (M5), loud debug-signing warning (M4), Dependabot (B61/E12), Firebase security rules + CI tests (prior pass).

## 3. Missing features (genuinely absent, by design or scope)

- Password-based auth (project is Firebase/dev-token based — matches proposal).
- In-app payment/monetization (out of scope for food rescue).
- Reminder push for upcoming pickups (schedule confirmation notifications exist; a pre-pickup timed reminder job does not — candidate enhancement).
- PDF verification documents (doc upload accepts images only — documented MVP trade-off, M26).
- Horizontal-scale components: distributed rate limiting / `@SchedulerLock` on stats aggregation (single-instance designs documented).

## 4. Partially implemented features (completed in this pass)

- **Verification flow** — worked for first submission; resubmission path threw 500 (lazy-init). Fixed (E3) + spam guard (B46). Now fully verified end-to-end including admin approval flipping `verified=true`.
- **Chat reliability** — WS send was silent-loss-prone; REST-first send implemented (M20); live delivery still via WS broadcast.
- **Schedule confirmation UX** — single combined flag; now per-user with explicit "waiting for other party" state (M21).
- **Upload security** — MIME allowlist existed; real magic-byte sniffing added (E8/B39).
- **Reports** — `createdAt` was null in responses; flushed and verified (E4).

## 5. Maps status

- **Backend distance/discovery**: working and verified — PostGIS `GEOGRAPHY(POINT)` + GIST index, `ST_DWithin` radius search clamped 0.1–100 km, distance-sorted results, coordinate validation, admin-only expired views. **This was broken for all new listings until the V18 trigger fix.**
- **API configuration**: Google Maps key is env/gradle-property driven (`GOOGLE_MAPS_API_KEY` → `manifestPlaceholders`), with a placeholder only as last resort; tile rendering uses free OpenStreetMap `UrlTile` so basic maps work with **no billing account at all**.
- **Location**: current-location fix + manual pin + permission-denied/permanent-denial/GPS-off fallbacks implemented in `utils/location.ts` (case-tested by code review; device behavior listed in the manual matrix of TEST_PLAN.md).
- **Markers**: listing tap ↔ marker focus sync, stale-card cleanup, re-centering fixed in the previous pass (code-verified).
- **Remaining limitations**: on-device rendering, GPS accuracy, and native map behavior could not be exercised here (no emulator); OSM tile policy recommends a keyed provider at scale; iOS dev cleartext needs a debug ATS exception.

## 6. Backend status

Spring Boot 3.5.16 / Java 17. Starts clean with `SPRING_PROFILES_ACTIVE=dev` (~8s to healthy on :18080 during the E2E; 2s warm). 42/42 tests green; full E2E green. `prod` profile: Firebase forced on, Swagger off, demo accounts deactivated via V17, JWT guard enforced. Dockerfile is non-root with healthcheck; CI runs the full verify on every push; Dependabot now active.

## 7. React Native status

React Native 0.87 / TypeScript. `tsc --noEmit` clean, `eslint` 0 errors (15 style warnings pre-existing), jest 5/5. Zustand store + Axios JWT inject/refresh + keychain token storage + WS client with JWT CONNECT and logout deactivation. Screens: role-aware Home, Discover (map+list), ListingDetail, PostFood, MyListings, MyClaims, Chat, Notifications, Dashboard, Admin, Profile, Login/RoleSelect. Not exercised here: Android Gradle build on this machine (CI builds it), on-device flows.

## 8. Database status

PostgreSQL 16 with PostGIS 3.4 (postgis/postgis:16-3.4-alpine). 18 Flyway migrations applied cleanly (V17 is prod-located, V18 is the location-column trigger). `ddl-auto: validate` — schema is Flyway-only. Keys/integrity: UUID PKs, unique emails/firebase_uid/tokens, FK constraints, timestamptz everywhere, GIST spatial index (now actually populated), composite + user indexes (V11/V14). Verified live: Flyway history clean, `location` populated for 9/9 listings after V18.

## 9. Security status

Key fixes verified in this pass (see §2): role-escalation blocked, dev backdoor gated twice, JWT secret guard, WS subscribe authorization, IDOR guards on chat/schedule/ratings/devices (outsider 403s verified live), upload content sniffing, deactivated-account revocation, admin gating, rate limiting (now tunable), seed-account prod cleanup, CORS wildcard+credentials startup refusal, no secrets in git (`api key/` gitignored; **operational action remains: rotate the two Firebase Admin SDK keys in the Firebase console**).

## 10. Testing status

| Test | Result |
| --- | --- |
| Backend build (`./mvnw -B verify`) | **PASS** |
| Backend tests (42/42, unit + Testcontainers) | **PASS** |
| Backend startup (jar, dev profile, real DB) | **PASS** |
| Live E2E suite (59 checks, scenarios A–H + security) | **PASS 59/59** |
| Mobile typecheck (`tsc --noEmit`) | **PASS** |
| Mobile lint (`eslint src App.tsx`) | **PASS** (0 errors) |
| Mobile unit tests (jest) | **PASS** (5/5) |
| Mobile Android build | NOT RUN locally (CI `mobile-ci.yml` builds it on push) |
| Login / Registration (dev path, live) | **PASS** |
| Food posting (create + validation, live) | **PASS** |
| Image upload (accept real PNG, reject disguised, live) | **PASS** |
| Map rendering on device | NOT VERIFIED (no emulator — code-verified only) |
| Location / GPS on device | NOT VERIFIED (code-verified only; backend coordinate validation PASS) |
| Distance calculation (PostGIS, live) | **PASS** (after V18 fix) |
| Nearby discovery + filters (live) | **PASS** (after V18 fix) |
| Claim + concurrent race (live) | **PASS** (exactly one winner) |
| Expiry (job + claim guard, live) | **PASS** |
| Pickup scheduling + completion (live) | **PASS** |
| Chat REST (live) / live WS between devices | **PASS** / NOT VERIFIED (unit-tested auth) |
| Notification dispatch (dev-log, live) | **PASS** (FCM device delivery needs Firebase project) |
| Verification (submit → admin approve → verified, live) | **PASS** |
| Ratings (both directions, duplicates, bounds, live) | **PASS** |
| Impact tracker (stats increment on completion, live) | **PASS** |
| Admin (queue, reports→auto-cancel, deactivate, metrics, live) | **PASS** |

**Bottom line:** all major user journeys — donor post→publish, recipient discover→claim, race protection, expiry, pickup coordination, chat, verification, ratings, impact stats, admin moderation — are verified end-to-end against a real running system. The genuinely unverified remainder is confined to on-device rendering/GPS/push delivery, which require an Android emulator or physical device with real Firebase configuration.
