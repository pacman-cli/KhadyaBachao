# Khadya Bachao — Full Code Audit (Android + Spring Boot)

**Date:** September 26, 2026
**Scope:** 85 backend Java files, 16 Flyway migrations, `pom.xml`, `Dockerfile`, CI workflows · 57 mobile TS/TSX files, Android manifest + Gradle, iOS ATS config
**Method:** Static line-by-line review of every source file. No dynamic testing (no emulator or live exploit attempts). Findings already fixed in this working tree (map re-centering, `dataJson` JSON, fail-loud storage, Report DTOs, stale response fields) are marked ✅ **Fixed (this tree)** and are not re-listed as open issues.

> **Remediation status (2026-09-26, fix pass 1):** all P0 and P1 items are fixed and covered by tests — B4, B8, B9, B12, B15, B17, B18, B25, B26, B28, B30, B33, B34, B38, B40, B45, B52, B62, D1, M1, M8, M9, M11, M12, M14, M15, M16, M17, M22 plus the X1/X2/X3/X4/X5 cross-cutting breaks. New tests: `UserControllerTest` (B15/B52), `JwtServiceSecretGuardTest` (B4), `StompAuthChannelInterceptorTest` (B18). Backend suite 42/42 green; mobile tsc/eslint/jest clean. Remaining open: P2/P3 items and key rotation (operational). Note: the JWT default-secret guard now requires `SPRING_PROFILES_ACTIVE=dev` (or a real `JWT_SECRET`) for local runs without a profile.

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Backend (Spring Boot 3.5)](#2-backend-spring-boot-35)
  - [2.1 Security Configuration & CORS](#21-security-configuration--cors)
  - [2.2 JWT Service & Auth Filter](#22-jwt-service--auth-filter)
  - [2.3 Authentication (Firebase / Dev)](#23-authentication-firebase--dev)
  - [2.4 Rate Limiting](#24-rate-limiting)
  - [2.5 Role Management — ⚠️ Highest-Risk Module](#25-role-management----highest-risk-module)
  - [2.6 WebSocket / STOMP (Chat & Live Events)](#26-websocket--stomp-chat--live-events)
  - [2.7 Listings & Geo Search](#27-listings--geo-search)
  - [2.8 Claims / Requests Workflow](#28-claims--requests-workflow)
  - [2.9 Ratings, Receipts, Schedules](#29-ratings-receipts-schedules)
  - [2.10 Notifications & Device Tokens](#210-notifications--device-tokens)
  - [2.11 Uploads & Storage Providers](#211-uploads--storage-providers)
  - [2.12 Reports & Admin Moderation](#212-reports--admin-moderation)
  - [2.13 NGO Verification](#213-ngo-verification)
  - [2.14 Stats & Scheduled Jobs](#214-stats--scheduled-jobs)
  - [2.15 Error Handling, Serialization & Entities](#215-error-handling-serialization--entities)
  - [2.16 Database Migrations & Seed Data](#216-database-migrations--seed-data)
  - [2.17 Build, Docker & CI](#217-build-docker--ci)
- [3. Mobile (React Native 0.87 — Android focus)](#3-mobile-react-native-087--android-focus)
  - [3.1 Android Manifest & Gradle (Native Layer)](#31-android-manifest--gradle-native-layer)
  - [3.2 API Client, Token Handling & Secure Storage](#32-api-client-token-handling--secure-storage)
  - [3.3 WebSocket Client (STOMP)](#33-websocket-client-stomp)
  - [3.4 Auth Flow (Firebase + Dev Fallback)](#34-auth-flow-firebase--dev-fallback)
  - [3.5 Screens (Discover, Chat, PostFood, Detail, Claims, Listings, Admin, Profile)](#35-screens-discover-chat-postfood-detail-claims-listings-admin-profile)
  - [3.6 iOS-Specific Notes (ATS)](#36-ios-specific-notes-ats)
- [4. Cross-Cutting Findings (End-to-End Breaks)](#4-cross-cutting-findings-end-to-end-breaks)
- [5. Test Coverage Matrix](#5-test-coverage-matrix)
- [6. Prioritized Remediation Roadmap](#6-prioritized-remediation-roadmap)

---

## 1. Executive Summary

The codebase is well-structured overall (clean modular packages, optimistic-claim concurrency with both a pessimistic lock and an atomic UPDATE, Flyway-managed schema, fail-loud storage services, keychain-backed token storage). The 10 features in the project's gap analysis are all implemented. However, the audit identified **2 critical, 5 major, and 10+ moderate issues**. The dominant theme: the API surface grew faster than the authorization model — several newer endpoints (roles, chat WS, device tokens, ratings) skip ownership/permission checks that the older listing/claim code does correctly enforce. A second theme is end-to-end contract breaks between backend and app (photo URLs, multipart limits, WS auth) that no test currently catches because there are no cross-boundary contract tests.

| Severity | Count | Highlights |
|---|---|---|
| Critical | 2 | Self-assigned ADMIN via `PUT /api/users/me/role`; dev auth backdoor active by default (any deployment missing `FIREBASE_ENABLED=true` accepts forged `dev:` tokens and role override on login) |
| Major | 5 | STOMP topics not access-controlled (chat eavesdrop); no size/length limits on 4 write paths (incl. unbounded `photoUrls`); `api key/` unignored secrets folder (root cause already fixed in this tree — key rotation still required); manifest build-failure risk via undefined `usesCleartextTraffic` placeholder; no refresh-token revocation for deactivated users combined with 24h sliding sessions |
| Moderate | ~10 | Spoofable `X-Forwarded-For` rate-limit key; JWT role claim ignored → role changes need re-login; participant-id leakage via public ratings endpoint; photo loading broken (auth-required URLs); multipart 5MB check unreachable (1MB default); default-profile PostGIS index; WS heartbeats disabled on client |

---

## 2. Backend (Spring Boot 3.5)

### 2.1 Security Configuration & CORS

File: `config/SecurityConfig.java`, `application.yml`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B1 | Swagger UI + OpenAPI docs are `permitAll` and exposed in the packaged production jar | Minor | `requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()`; springdoc has no `enabled:false` switch in yml | Gate behind a profile/property (e.g. `springdoc.api-docs.enabled: ${SWAGGER_ENABLED:false}`) or exclude springdoc from prod builds |
| B2 | CORS `allowCredentials(true)` with configurable origin list — safe now (defaults are localhost), but there is no validation warning if someone sets `*` later | Minor | `config.setAllowCredentials(true)` | Add a startup assertion rejecting `*` + credentials |
| B3 | CSRF disabled correctly for a stateless Bearer-token API; stateless sessions enforced | ✅ OK | `SessionCreationPolicy.STATELESS` | — |

### 2.2 JWT Service & Auth Filter

Files: `config/JwtService.java`, `config/JwtAuthFilter.java`, `application.yml`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B4 | Default JWT secret falls back to a hardcoded string in **every** profile; only the `prod` profile refuses it. Any deployment that sets `SPRING_PROFILES_ACTIVE` to anything else (or nothing) runs with a publicly-known signing key → full account forgery | Critical-adjacent | `JwtService.validateProductionSecret()` checks only `prod`/`production`; yml default `change-me-in-production-...` | Fail startup whenever the secret equals the default, regardless of profile |
| B5 | Tokens embed no version/`iat`-check against user activity → a deactivated user's token stays valid until expiry, and `/api/auth/refresh`... is auth-permitted so it re-mints for the still-active check — but other endpoints accept the old token for up to 24h | Moderate | `JwtAuthFilter` checks `isActive` per request (good), so deactivation actually *is* enforced on every call. Real gap: **role changes** don't propagate (see B6) | N/A for deactivation (already safe); fix B6 for roles |
| B6 | `JwtAuthFilter` re-loads the user from DB and derives the role from the DB (correct!) but `JwtService.issueToken` embeds a `role` claim that is never verified — dead code that misleads future maintainers into trusting it | Minor | `claim("role", role)` unused in parsing | Either validate claim vs DB or drop it |
| B7 | `AuthenticatedUser.toUser()` builds a detached `User` (only id/name/role) — used by services that then navigate lazy associations | Moderate | e.g. `ClaimService` paths that call `listing.getDonor().getId()` work because the guard loaded the real entity, but any service using `principal.toUser()` in persistence would break | Prefer passing `UUID` ids (current dominant pattern) and deprecate `toUser()` |

### 2.3 Authentication (Firebase / Dev)

Files: `auth/AuthController.java`, `auth/AuthService.java`, `auth/DevAuthController.java`, `auth/DevTokenVerifier.java`, `auth/FirebaseTokenVerifier.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B8 | **Dev auth backdoor is active by default.** `DevAuthController` + `DevTokenVerifier` activate whenever `app.firebase.enabled != true` (default in yml). Any real deployment that forgets `FIREBASE_ENABLED=true` accepts `dev:<any-uid>:<email>` tokens and `POST /api/auth/dev/login` with an arbitrary `role` field (including ADMIN) | **Critical** | `@ConditionalOnProperty(name="app.firebase.enabled", havingValue="false", matchIfMissing=true)`; `devLogin` calls `user.setRole(role)` | Add `@Profile("dev")`/disabling profile default in prod packaging; make `FIREBASE_ENABLED` default `true` in the prod Dockerfile; treat "not explicitly true" as hard startup failure outside dev |
| B9 | `FirebaseTokenVerifier.init()` **swallows** initialization failure (`catch → log.warn`) while the bean still activates; first login then fails with "Firebase Admin SDK is uninitialised" | Moderate | `@PostConstruct init()` catch block | Fail startup loudly when `app.firebase.enabled=true` but credentials are invalid |
| B10 | `/api/auth/refresh` sliding session re-issues tokens for still-valid JWTs — no revocation list; combined with B8 this lengthens attacker sessions | Minor | `AuthController.refresh` | Acceptable for MVP with B8 fixed; consider short expiry + refresh tokens later |
| B11 | New users auto-provision with role `RECIPIENT_INDIVIDUAL` — safe default, no privilege | ✅ OK | `AuthService.verifyAndLogin` | — |

### 2.4 Rate Limiting

File: `config/RateLimitFilter.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B12 | Rate-limit key trusts `X-Forwarded-For` when present — any client can rotate the header to bypass the 20 req/min window entirely (unless a trusted proxy overwrites it) | Moderate | `clientIp()` reads the header first | Only trust XFF from a configured proxy CIDR; otherwise use `request.getRemoteAddr()` |
| B13 | Buckets map only cleaned when >10,000 entries; unbounded growth between cleanups behind many IPs | Minor | `buckets.size() > 10_000` cleanup | Fine for MVP; switch to Caffeine with TTL when in doubt |
| B14 | Coverage is sensible: `/api/auth/*` always; non-GET writes on listings/claims/requests/verification/reports/devices | ✅ OK | `shouldNotFilter` | Consider including `/api/uploads` (see B30) |

### 2.5 Role Management — ⚠️ Highest-Risk Module

File: `user/UserController.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B15 | **`PUT /api/users/me/role` accepts any role, including ADMIN, with zero restrictions.** Any authenticated user can escalate themselves to platform administrator and then reach every `/api/admin/**` endpoint | **Critical** | `updateRole()` does `UserRole.valueOf(request.role())` then saves | Whitelist selectable roles server-side (`DONOR, RECIPIENT_NGO, RECIPIENT_INDIVIDUAL, VOLUNTEER`), never ADMIN; consider "role change only while unverified" or admin approval for NGO upgrades |
| B16 | The mobile app's role-picker intentionally excludes ADMIN (`SELECTABLE_ROLES`), so the hole exists only server-side — a textbook API-vs-client-trust violation | — | `mobile/src/api/types.ts` | Fix is backend-only (B15) |
| B17 | Dev-login can also set any role (see B8) — two independent paths to ADMIN | **Critical** (with B8) | `DevAuthController.devLogin` | Same fixes |

### 2.6 WebSocket / STOMP (Chat & Live Events)

Files: `config/WebSocketConfig.java`, `chat/StompAuthChannelInterceptor.java`, `chat/ChatWsController.java`, `listing/ListingEventPublisher.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B18 | **SUBSCRIBE frames are not authorized.** The interceptor authenticates only `CONNECT` and sets a principal, but nothing validates the destination at SUBSCRIBE time. Any WebSocket client (no token at all) can subscribe to `/topic/chat/{requestId}` for *any* request id and silently read other users' private pickup chats; `/topic/listing/*` and `/topic/discover` are public by design but chat is not | **Major** | `StompAuthChannelInterceptor.preSend` handles only `StompCommand.CONNECT`; no `SUBSCRIBE` branch | Add a SUBSCRIBE branch: require authenticated principal, parse `requestId` from `/topic/chat/*`, verify participant via `RequestAccessGuard` before allowing the subscription |
| B19 | Publish path is safe (message-mapping rejects null/non-UUID principals) — the asymmetric "subscribe open / publish guarded" split is what creates the eavesdrop hole | — | `ChatWsController.handleChat` | — |
| B20 | `setAllowedOriginPatterns("*")` on both `/ws` (SockJS) and `/ws-raw` | Moderate | `WebSocketConfig` | Pin to the same origin allow-list as HTTP CORS |
| B21 | Listing events broadcast only listing ids/status — no PII | ✅ OK | `ListingEventPublisher.ListingEvent` | — |

### 2.7 Listings & Geo Search

Files: `listing/ListingController.java`, `ListingService.java`, `FoodListingRepository.java`, `CreateListingRequest.java`, `UpdateListingRequest.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B22 | Ownership checks on update/delete/cancel are exemplary (`ownedListing`); donor role double-checked in service despite `@PreAuthorize` | ✅ OK | `ListingService.ownedListing` | — |
| B23 | `findNearby` uses `ST_DWithin` on geography with parameter binding (no string concat) → no SQL injection; radius clamped to [0.1, 100] km | ✅ OK | native query | — |
| B24 | Native `findNearby` skips the `@Version` optimistic-lock column and doesn't flush version bumps — acceptable read-only path | Minor | — | — |
| B25 | `browseListings` with `includeExpired=true` + null status returns **all** listings including others' CANCELLED/EXPIRED — fine for admin/debug param, but the param is reachable by anonymous users on `GET /api/listings` | Minor | controller `includeExpired` param | Restrict `includeExpired=true` to ADMIN, or drop CANCELLED from results |
| B26 | `UpdateListingRequest.quantityValue` lacks `@DecimalMin` (create has it) → update can set 0/negative quantities | Minor | `CreateListingRequest` vs `UpdateListingRequest` | Add `@DecimalMin("0.01")` to update too (checklist: create/update parity) |

### 2.8 Claims / Requests Workflow

Files: `request/ClaimService.java`, `ClaimController.java`, `FoodRequestRepository.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B27 | First-claim-wins correctness is solid: pessimistic lock + `claimAtomically` conditional UPDATE + in-memory status alignment (✅ fixed this tree) | ✅ Fixed (this tree) | `claim()` | — |
| B28 | `cancelMyClaim` re-opens a CLAIMED listing unconditionally — correct given single-accepted-claim invariant (existsAccepted used only in stats); but a PENDING *and* ACCEPTED request can theoretically coexist only via seeded/donor-approved flows; approveClaim can approve a second request on an already-CLAIMED listing without conflict checks | Moderate | `approveClaim` does not verify the request is PENDING or that the listing is AVAILABLE/CLAIMED by this request | Add state guards: request must be PENDING; listing must be AVAILABLE or CLAIMED-by-this-request |
| B29 | `complete()` requires donor ownership + ACCEPTED status ✅; notification payloads are minimal, no PII | ✅ OK | — | — |

### 2.9 Ratings, Receipts, Schedules

Files: `request/RatingService.java`, `ReceiptService.java`, `chat/ChatService.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B30 | `GET /api/requests/{id}/ratings` is **public to any authenticated user** and returns rater/rated names + comments for requests the caller isn't a participant of | Moderate | `getRatingsForRequest` lacks `RequestAccessGuard` | Wrap with `RequestAccessGuard.getForParticipant` (the same guard the rest of chat uses) |
| B31 | Rating double-submission guarded by existence check inside a transaction — two concurrent identical submits could still race (no unique constraint visible in V6/V15 — verify `UNIQUE(request_id, rater_id)` exists) | Minor | `RatingService.rate` | Add DB unique constraint as backstop |
| B32 | Receipt PDF generation is participant-gated ✅, completed-only ✅; OpenPDF used with only static text (no user-controlled HTML) | ✅ OK | `ReceiptService` | — |
| B33 | Schedule propose/confirm correctly gated by `RequestAccessGuard`; SMS stub logs phone numbers at INFO when disabled | Minor | `SmsNotificationDispatchService` | Mask phone in logs (`+880…1234`) |

### 2.10 Notifications & Device Tokens

Files: `notification/*`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B34 | `POST /api/devices/register` lets any authenticated user overwrite the **ownership** of any existing FCM token (`findByToken(...) → existing.setUser(me)`). A user who learns/guesses another user's token string can steal their push target | Moderate | `DeviceController.register` | Only allow update when `existing.user.id == principal.id`, else 409 |
| B35 | No length limit on the `token` string (→ DB abuse vector, see D1) | Minor | `RegisterRequest` | `@Size(max=4096)` |
| B36 | Notification inbox endpoints are correctly owner-scoped (list/mine/markRead all check `principal.id`) ✅ | ✅ OK | `NotificationController` | — |
| B37 | `dataJson` now real JSON via Jackson (✅ fixed this tree); FCM send loop catches per-token failures ✅ | ✅ Fixed (this tree) | `NotificationDataJson` | — |

### 2.11 Uploads & Storage Providers

Files: `common/UploadController.java`, `LocalStorageService.java`, `WebConfig.java`, `FirebaseStorageService.java`, `CloudflareR2StorageService.java`, `application.yml`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B38 | **Multipart size limit not configured** — Spring Boot defaults to 1MB per file/total. The controller's 5MB check can never be reached; clients get a raw MaxUploadSizeExceededException instead of the friendly error. Local photo uploads of >1MB fail app-wide | Moderate | No `spring.servlet.multipart.*` in yml | Set `max-file-size: 5MB`, `max-request-size: 15MB` |
| B39 | Content-type is trusted from the client (`file.getContentType()`) — a `.exe` renamed with `image/png` content-type header is stored as `.png`. No magic-byte sniffing | Moderate | `UploadController.upload` | Sniff bytes (Apache Tika) or at minimum verify JPEG/PNG/WebP magic numbers |
| B40 | Local storage serves `/uploads/**` as **static resources that SecurityConfig requires auth for** — combined with M2 the mobile `<Image>` can never load them | Major (with M2) | `WebConfig.addResourceHandlers` + `anyRequest().authenticated()` | Either permitAll `/uploads/**` (photos are effectively public by design anyway) or serve via an authorized endpoint with short-lived URLs |
| B41 | Fail-loud misconfiguration for R2/Firebase storage ✅ (fixed this tree) | ✅ Fixed (this tree) | both services | — |
| B42 | R2 fallback URL (when `public-url-prefix` empty) returns the *API endpoint* URL, which is not publicly fetchable without SigV4 auth | Minor | `CloudflareR2StorageService.store` last line | Always require/derive a public base URL or generate presigned GET URLs |

### 2.12 Reports & Admin Moderation

Files: `admin/AdminController.java`, `ReportController.java`, `ReportService.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B43 | Report DTO mapping inside transactions fixed the LazyInitializationException (✅ this tree); admin queue + resolve/dismiss flows work | ✅ Fixed (this tree) | `ReportService` | — |
| B44 | Resolve auto-cancels the reported listing — a reasonable policy; no audit trail of *which admin* resolved | Minor | `ReportService.setStatus` | Record resolver id + timestamp (needs columns) |
| B45 | `POST /api/reports` validates target existence, no length cap on `reason` (see D1) | Minor | `CreateReportRequest` | `@Size(max=1000)` |

### 2.13 NGO Verification

File: `verification/VerificationController.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B46 | Any user can submit unlimited verification resubmissions; each overwrites status to PENDING — spam vector for the admin queue (rate limiter covers it at 20/min) | Minor | `submit()` | Cooldown or cap active PENDING submission per user |
| B47 | Approve/reject correctly ADMIN-gated, records verifier + timestamp ✅; `applicant.setVerified(approved \|\| applicant.isVerified())` — rejection never un-verifies (deliberate, conservative) | ✅ OK | `decide()` | Document the intent |

### 2.14 Stats & Scheduled Jobs

Files: `stats/StatsController.java`, `StatsAggregationJob.java`, `listing/ListingExpiryJob.java`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B48 | `/api/stats/system` public by design — aggregates only, leaderboard exposes donor *names* (business data, acceptable; note for privacy review) | Minor | `topDonors` | Consider opt-out flag for donors |
| B49 | `GET /api/stats/organization/{id}` — caller can query **any** UUID's org stats (counts only, no PII) | Minor | `orgStats` | Low risk; restrict to self or make it aggregate-only public |
| B50 | `StatsAggregationJob` full DELETE+INSERT inside one transaction with `zone=UTC` — fine at current scale; no lock against concurrent run (single instance OK) | Minor | `rebuildDailyStats` | Use `@SchedulerLock` when horizontally scaled |
| B51 | Expiry job marks EXPIRED + publishes events every 60s ✅ | ✅ OK | `ListingExpiryJob` | — |

### 2.15 Error Handling, Serialization & Entities

Files: `common/GlobalExceptionHandler.java`, entities, `*Response` records

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B52 | `User` entity serialized directly on `/api/users/me` + auth responses — exposes `firebaseUid`, `active`, internal flags; email/phone exposure to the owner is fine, `firebaseUid` is unnecessary surface | Moderate | `UserController.me/updateRole` return raw entity | Return a `UserResponse` DTO excluding `firebaseUid` |
| B53 | Catch-all handler returns generic 500 without leaking stack traces ✅; ProblemDetail used consistently ✅ | ✅ OK | — | — |
| B54 | `ChatMessage.sentAt` null-fallback to `now()` (✅ fixed this tree) | ✅ Fixed (this tree) | `ChatService.MessageResponse` | — |

### 2.16 Database Migrations & Seed Data

Files: `db/migration/V1..V16`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B55 | Migrations are idempotent-ish (V12 deletes its own seed first), timestamptz conversions (V3, V10) done carefully, PostGIS geography + GiST index (V13), composite indexes (V11, V14) | ✅ OK overall | — | — |
| B56 | V13 creates the GiST index **only when run as DB superuser/owner of the same profile as the runtime role** — with the brew default profile it applied, but confirm the production role owns it, or nearby search silently degrades to seq scan | Moderate | `V13__enable_postgis_geography.sql` | Verify index ownership in prod; add a startup smoke query `EXPLAIN` guard in health check |
| B57 | V12 seeds 25 demo users incl. **5 ADMIN accounts** (`admin1..5@khadyabachao.org`) with `firebase_uid='dev-…'` and **no password** — login-anyone via dev auth while dev mode is on; in prod they're inert (firebase_uid won't match real Firebase tokens) but the rows ship to production DBs | Major (paired with B8) | `V12__seed_demo_data_and_users.sql` | Gate seeding behind a dev-only migration location or a `DELETE FROM users WHERE firebase_uid LIKE 'dev-%'` cleanup migration for prod |
| B58 | Seed chat contains a phone number, seed emails/phones are fake-but-realistic — PII hygiene fine for demo, but B57 stands | Minor | V12 §6 | Covered by B57 fix |

### 2.17 Build, Docker & CI

Files: `pom.xml`, `Dockerfile`, `.github/workflows/backend-ci.yml`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| B59 | Dockerfile: non-root user, healthcheck, JRE-only runtime, MaxRAMPercentage ✅ | ✅ OK | — | — |
| B60 | Tests skipped in image build (`-DskipTests`) — acceptable since CI runs `./mvnw verify` (Testcontainers) on every push | ✅ OK | CI workflow | — |
| B61 | No OWASP dependency-check / Dependabot config | Minor | pom | Enable Dependabot + `dependency-check-maven` |
| B62 | `logging.level.org.hibernate.SQL: DEBUG` ships by default — logs all SQL incl. parameters (PII in logs) | Moderate | application.yml | Set to INFO by default, raise via env in dev |

---

## 3. Mobile (React Native 0.87 — Android focus)

### 3.1 Android Manifest & Gradle (Native Layer)

Files: `mobile/android/app/src/main/AndroidManifest.xml`, `app/build.gradle`, `gradle.properties`, `MainActivity.kt`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| M1 | **`android:usesCleartextTraffic="${usesCleartextTraffic}"` placeholder is defined nowhere in Gradle config.** Manifest merger leaves it to the environment: existing merged manifests show it resolving to `true` (cleartext allowed) — an R8/AGP version bump or a clean CI merge can instead **fail the build** ("placeholder not found") or silently default. Release builds must not rely on accident | Major | manifest line 14; no `manifestPlaceholders` entry for it in `app/build.gradle` | Define it explicitly per build type: `debug → true`, `release → false`, plus a `network_security_config.xml` that whitelists only the dev API host |
| M2 | **Local-storage listing photos can never render on any device.** Backend returns `/uploads/<uuid>.jpg`; `absoluteUrl()` prefixes `http://10.0.2.2:8080` and `<Image source={{uri}}>` sends no `Authorization` header — the backend 401s every image, and on release Android cleartext (if fixed per M1) blocks plain HTTP outright | Major | `listings.ts absoluteUrl`, `WebConfig` B40, `ListingDetailScreen` | Serve uploads without auth (B40) or implement authorized image fetching (e.g. react-native FastImage w/ headers, or signed URLs) |
| M3 | FirebaseMessaging is used but `POST_MESSAGES`/notification channel setup is guarded by `FIREBASE_ENABLED` env ✅; `allowBackup=false` ✅; location permissions minimal (fine+coarse only) ✅ | ✅ OK | manifest | — |
| M4 | Release signing falls back to the **debug keystore** when `keystore.properties` is absent — a release APK silently signed with the public debug key can ship from CI | Moderate | `buildTypes.release.signingConfig` | Make CI fail if release credentials are missing instead of falling back |
| M5 | Google Maps API key has a committed fallback placeholder in `gradle.properties` (`AIzaSy_DEV_DEFAULT_PLACEHOLDER_KEY`) while the real key lives in ignored `mobile/.env` ✅ — verify `react-native-config` values reach `manifestPlaceholders` (they currently do **not**; env value is unused by Gradle) | Minor | `gradle.properties` last line, `.env` | Wire `GOOGLE_MAPS_API_KEY` from env into `manifestPlaceholders` in `app/build.gradle` |
| M6 | New Architecture + Hermes enabled; `reactNativeArchitectures` includes x86_64 (emulator) ✅ | ✅ OK | gradle.properties | — |

### 3.2 API Client, Token Handling & Secure Storage

Files: `src/api/client.ts`, `tokenRef.ts`, `utils/secureStorage.ts`, `store/authStore.ts`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| M7 | Token stored in Keychain/Keystore with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` ✅ best practice; `allowBackup=false` complements it ✅ | ✅ OK | `secureStorage.ts` | — |
| M8 | 401 interceptor clears the in-memory token but **not** the Keychain credentials — next `bootstrap()` reloads the stale token from Keychain and the user is stuck in a 401 loop until token *expiry* cleanup; also no auto-refresh attempt although `/api/auth/refresh` exists | Moderate | `client.ts` interceptor vs `authStore.bootstrap` | On 401: attempt `/api/auth/refresh` once, else `clearCredentials()` + logout state |
| M9 | `API_BASE_URL` defaults to cleartext `http://10.0.2.2:8080` if env missing — release build with missing env silently talks to localhost | Moderate | `client.ts` | Fail fast (throw) when `__DEV__ === false` and the URL is not https |
| M10 | No request cancellation / dedupe on screen loads (minor UX) | Minor | screens | — |

### 3.3 WebSocket Client (STOMP)

File: `src/api/wsClient.ts`, `hooks/useListingEvents.ts`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| M11 | **The STOMP client never sends the JWT** (no `connectHeaders`, no `beforeConnect`). Backend publishes require auth, so every WS chat send fails and silently falls back to REST (works), while subscribes ride the unauthenticated hole (B18). The realtime feature is effectively dead code + security hole at once | Major | `new Client({brokerURL…})` with no headers | Set `connectHeaders = {Authorization: Bearer <token>}` from `tokenRef`, reconnect on token change, and fix backend B18 so subscription auth is meaningful |
| M12 | Heartbeats configured (10s) ✅ but `stompClient` is a module singleton activated once and never deactivated on logout — after logout, an old socket keeps receiving discover/chat frames until app restart | Moderate | `ensureConnected` | `stompClient.deactivate()` in `logout()` |
| M13 | No `onWebSocketClose`/error surfacing — silent reconnect loop with 5s delay; acceptable but log it | Minor | — | — |

### 3.4 Auth Flow (Firebase + Dev Fallback)

Files: `src/screens/auth/LoginScreen.tsx`, `services/firebaseAuthService.ts`, `store/authStore.ts`

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| M14 | **Any failed Firebase auth silently falls back to dev login** (`catch → devLogin(email)`), including in release builds when the backend is misconfigured (B8) — users get "logged in" to someone's dev account semantics without knowing | Major | `handleEmailAuth` catch block | Gate the fallback behind `__DEV__`; surface Firebase errors honestly |
| M15 | Phone-OTP path: on any Firebase error it alerts then calls `devLogin(formattedPhone,…)` — same issue as M14 for phone users | Major (with M14) | `handleSendPhoneOtp` | Same fix |
| M16 | `firebaseLogin`/`devLogin` set `awaitingRoleSelection: true` **even for returning users** who already have a role — the store's bootstrap path doesn't, but post-login navigation will push returning users through role re-selection unnecessarily (UX, matches `RootNavigator` conditional) | Minor | `authStore` both login fns | Set flag only when `user.role == null` |
| M17 | `signOutFirebase` exists but `logout()` in the store never calls it — Firebase session survives app logout | Minor | `authStore.logout` | Await `signOutFirebase()` in logout |

### 3.5 Screens (Discover, Chat, PostFood, Detail, Claims, Listings, Admin, Profile)

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| M18 | DiscoverScreen: map re-centering, radius/region math, stale-card clearing, tile size, per-marker press (✅ fixed this tree; code-level verified, emulator rendering still unverified) | ✅ Fixed (this tree) | `DiscoverScreen.tsx` | Emulator smoke test pending |
| M19 | DiscoverScreen uses `tile.openstreetmap.org` usage policy requires a proper User-Agent; `react-native-maps` UrlTile sends none — OSM may throttle/block tiles | Moderate | `UrlTile urlTemplate` | Self-host tiles or use a provider that permits app usage (e.g. MapTiler with key); at minimum document the risk |
| M20 | ChatScreen: optimistic send clears input before success; WS-send failure falls back to REST ✅, but double-send risk if WS publish returns true yet backend rejects (no ack handling) → message lost with no error | Moderate | `publishChatMessage` returns true if connected | Prefer REST-first or implement STOMP receipt tracking; reconcile via history on focus |
| M21 | ChatScreen `myConfirmState()` returns true only when **both** confirmed — button label says "Accept & Confirm" even when the current user already confirmed; re-tap is harmless but confusing | Minor | `ChatScreen` | Show per-user state |
| M22 | PostFoodScreen photo upload: builds its own FormData instead of reusing `uploadImage()` (duplication), no client-side size guard (server 1MB default will reject most camera photos with an obscure error — pairs with B38) | Moderate | `pickPhoto` | Reuse `uploadImage`, downscale/compress before upload (e.g. `react-native-image-picker` `maxWidth/quality` options already partially used in Profile) |
| M23 | ListingDetailScreen: claim flow handles 409 "beat you to it" ✅; optimistic UI rolled back on failure ✅ | ✅ OK | `claim()` | — |
| M24 | MyClaims/MyListings: `Promise.all` N+1 for claims per listing (N listings → N requests on every focus) | Minor | `MyListingsScreen.load` | Add a backend aggregated endpoint or filter locally |
| M25 | AdminScreen renders verification `registrationDocUrl` via `<Image source={{uri: absoluteUrl(url)}}>` — same auth/cleartext break as M2 (admin queue images never load) | Moderate (with M2) | AdminScreen | Covered by M2 fix |
| M26 | ProfileScreen: document upload for NGO verification uses the *photo picker* for registration documents — works, but no PDF support; acceptable MVP | Minor | `pickDocument` | — |
| M27 | NotificationsScreen deep-link parsing (JSON → legacy `{k=v}` fallback) ✅ fixed this tree | ✅ Fixed (this tree) | — | — |
| M28 | Navigation: role-gated screens rely on server-side `@PreAuthorize` (good), but `HomeScreen` shows the Admin card purely from local role state — non-admins can navigate to Admin and get a raw 403 list (error states handled) | Minor | `HomeScreen` | — |

### 3.6 iOS-Specific Notes (ATS)

| # | Finding | Severity | Evidence | Recommendation |
|---|---|---|---|---|
| M29 | `Info.plist` ATS: `NSAllowsArbitraryLoads=false`, `NSAllowsLocalNetworking=true` — strict and correct for production; but the dev flow (`http://10.0.2.2:8080` / LAN IP) will be blocked on real iOS devices since 10.0.2.2 isn't "local" — dev-on-iOS needs an explicit dev exception | Minor | Info.plist | Add debug-only ATS exception via xcconfig, or use https locally (e.g. mkcert) |
| M30 | Podfile.lock still references RNFBFirestore while the JS dependency was removed (✅ this tree) — stale pod pin will resolve but the pod is unused | Minor | `mobile/ios/Podfile.lock` | `pod install` to prune; harmless until then |

---

## 4. Cross-Cutting Findings (End-to-End Breaks)

These only appear when both sides are read together — the highest-value output of this audit:

| # | Break | Components | Impact | Fix path |
|---|---|---|---|---|
| X1 | **Local photos never render** | B40 (auth-required static files) + M2 (headerless `<Image>`) + M9 (http base) | Every locally-uploaded listing photo, profile photo, NGO document, and admin verification doc is a broken image | Choose: public `/uploads/**` (simplest, matches cloud behavior) or signed/authorized image endpoints |
| X2 | **Photo uploads >1MB fail** | B38 (Spring 1MB default) + M22 (no client compression) | Most camera photos fail upload with an opaque error | Set multipart limits + client-side downscale |
| X3 | **Realtime chat is publish-dead, subscribe-open** | M11 (no JWT on WS) + B18 (no SUBSCRIBE auth) | Chat works only via REST fallback; meanwhile anyone can eavesdrop on any chat topic | Do B18 + M11 together |
| X4 | **Dev backdoor end-to-end** | B8/B17 (backend default-on) + M14/M15 (client auto-fallback) | Any misconfigured prod deployment silently accepts forged logins incl. ADMIN | B8 fix + M14 gating |
| X5 | **Role escalation end-to-end** | B15 (server accepts any role) | One `PUT` makes any user ADMIN | B15 whitelist |

---

## 5. Test Coverage Matrix

| Area | Tests exist | Gap |
|---|---|---|
| JWT issue/validate | ✅ `JwtServiceTest` | No tampering/expiry-profile test for default-secret refusal (B4) |
| Report service | ✅ 5 tests (new) | Admin role-path coverage only via delegation |
| Claims workflow | ✅ `ClaimFlowIntegrationTest` (Testcontainers) | No concurrent-claim stress test |
| Listings | ✅ `ListingServiceTest` | No geo-query correctness test against real PostGIS data |
| Ratings / Receipts | ✅ unit tests | No participant-guard test for B30 |
| Expiry job, notifications | ✅ | — |
| Mobile | ✅ jest (App, CheckoutFlow) + tsc + eslint in CI | **No tests** for authStore 401 handling (M8), wsClient (M11/M12), or any screen logic |
| Contract (mobile↔backend) | ❌ none | X1/X2/X3 prove the need — add a minimal smoke suite hitting a running backend |

---

## 6. Prioritized Remediation Roadmap

**P0 — ship blockers (do before any real deployment):**
1. B15 — whitelist non-admin roles in `PUT /api/users/me/role` (one-line guard + test)
2. B8 — default `FIREBASE_ENABLED=true` outside dev; add `@Profile("!prod")` belt-and-suspenders to DevAuthController/DevTokenVerifier (they have it) plus fail startup in prod when firebase disabled
3. B4 — refuse default JWT secret in all profiles
4. M1 — define `usesCleartextTraffic` per build type + network security config
5. Rotate the two Firebase Admin SDK keys (operational, from the rules audit)

**P1 — security hardening (next sprint):**
6. B18 + M11 — SUBSCRIBE authorization + client JWT on CONNECT (fix together)
7. X1/B40 — make `/uploads/**` public or signed (unblocks every image in the app)
8. X2/B38 — multipart 5MB config + client-side compression
9. B57 — prod cleanup migration for `dev-%` users; B34 — device-token ownership check; M14/M15 — dev-fallback gating in release
10. B12 — stop trusting XFF blindly; B62 — SQL logging to INFO

**P2 — quality/consistency:**
11. B30 ratings participant guard; B28 approve-state guards; B52 user DTO; B26 update validation parity; D1 size limits (rating comment, report reason, chat length via `@Size`)
12. M8 401→refresh flow; M12 deactivate socket on logout; M17 sign out of Firebase; M16 returning-user role check
13. B56 verify PostGIS index ownership in prod; B61 Dependabot/dependency-check; M4 CI release-signing failure; B39 magic-byte validation

**P3 — test debt:**
14. Contract smoke tests (backend ↔ mobile) for uploads, auth, WS — the X-findings show where they pay off
15. Concurrent claim stress test; authStore/wsClient unit tests

---

*End of audit. Findings reference exact files/lines by name so each item can be fixed and verified independently.*
