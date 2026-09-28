# TEST_PLAN.md — Khadya Bachao

## 1. Automated suites (CI gates)

CI (`backend-ci.yml`, `mobile-ci.yml`, `firebase-rules-ci`) runs everything below on every push.

### Backend — `./mvnw -B verify` (from `backend/`, needs Docker for Testcontainers)

| Suite | What it covers |
| --- | --- |
| `JwtServiceTest` | token issue/validate, expiry, secret handling |
| `JwtServiceSecretGuardTest` | startup refusal of the default JWT secret (B4) |
| `UserControllerTest` | role whitelist / no ADMIN self-assign (B15), profile DTO (B52) |
| `StompAuthChannelInterceptorTest` | WS CONNECT JWT + SUBSCRIBE participant authorization (B18/M11) |
| `ListingServiceTest` | create/update validation, ownership, expiry re-open rule |
| `ListingExpiryJobTest` | scheduled expiry transition |
| `ClaimFlowIntegrationTest` (Testcontainers Postgres) | full claim workflow against a real DB |
| `RatingServiceTest` | bounds, one-rating-per-rater, participant rules |
| `ReceiptServiceTest` | participant-gated PDF receipts |
| `ReportServiceTest` | report creation, target validation, moderation actions |
| Status | **42/42 passing** (2026-09-27) |

### Mobile — CI order (from `mobile/`)

| Command | Covers | Status |
| --- | --- | --- |
| `npx tsc --noEmit` | type safety across 57 TS/TSX files incl. screens/stores/api | **clean** |
| `npx eslint src App.tsx` | lint (CI scope; `npm run lint` is broader) | **clean** (0 errors) |
| `npm test -- --watchAll=false` | jest suites (`App.test.tsx`, `CheckoutFlow.test.tsx`) | **5/5 passing** |

### Firebase rules — `firebase/rules.test.js`

9 emulator-driven tests pinning the rules contract: Firestore locked mode; Storage `uploads/*` read-only for clients, all writes via backend Admin SDK. Run: `firebase emulators:exec --only firestore,storage "node firebase/rules.test.js"`.

---

## 2. Live end-to-end verification (this session)

Scripted 59-check suite ([backend/e2e/e2e_smoke.sh](backend/e2e/e2e_smoke.sh)) against a real server (`SPRING_PROFILES_ACTIVE=dev`, Postgres 16 + PostGIS via docker compose). **Result: PASS=59 FAIL=0.** It exercises the master test scenarios:

| Scenario | Checks (all passing) |
| --- | --- |
| **A — Donor** | dev login → profile read/update → create listing (server validation: past deadline 400, `pickupLat=200` 400) → PNG upload (200; disguised-text upload 400) → listing visible in nearby search |
| **B — Recipient** | login → nearby discovery with radius + `foodType` filters → claim (201, auto-accepted) |
| **C — Claim race** | second claimant → 409; **true concurrent race**: two simultaneous claims → exactly one 2xx, one 409 |
| **D — Expiry** | short-deadline listing → expiry job flips `EXPIRED` (~85s) → claim attempt → 409 |
| **E — Pickup** | chat messages both directions → schedule propose → both confirm (`CONFIRMED`, per-user flags) → complete → listing `COMPLETED` → `stats/me.quantityRescued` increments |
| **F — Verification** | NGO submits doc → PENDING; resubmission blocked 409 (B46) → admin approves → `verified=true` |
| **G — Map/Location backend** | coordinate validation, radius search, foodType filter, server-side distance ordering |
| **H — Notifications** | 11 push dispatches logged (claim, chat, schedule, completion, rating, verification) |
| **Security** | anonymous 401 · ADMIN self-assign 400 · non-admin on admin API 403 · outsider chat/schedule 403 (IDOR) · device-token theft 409 (B34) · deactivated user's JWT → 401 · duplicate rating 409 · rating 6 → 400 · disguised upload 400 |

Run it: start DB (`docker compose up -d postgres`), backend (`SERVER_PORT=18080 DB_PORT=5433 SPRING_PROFILES_ACTIVE=dev RATE_LIMIT_MAX_REQUESTS=500 java -jar target/khadya-bachao-backend-0.1.0-SNAPSHOT.jar`), then `bash /tmp/kb_e2e2.sh` (consider committing the script under `backend/e2e/` for reuse).

---

## 3. Manual test matrix (requires Android emulator/device — not automatable here)

These remain the honest gaps; each has a documented procedure in `Khadya_Bachao_End_To_End_System_And_Visual_Testing_Guide.md` and `RELEASE_GUIDE.md`:

1. **Map rendering**: tiles load (OSM UrlTile), markers cluster/perform, marker tap → listing card sync, listing tap → camera re-centers.
2. **Location permission cases**: granted / denied / denied-permanently / GPS off / manual pin / inaccurate GPS / offline — app must never crash (code paths implemented in `utils/location.ts`; verify on device).
3. **Google Auth on device**: real Firebase project config (`google-services.json`) + `FIREBASE_ENABLED=true` backend; verify ID-token exchange and phone-OTP.
4. **FCM delivery**: foreground, background, terminated; tap → correct listing deep-link; duplicate suppression.
5. **Live WS chat between two devices**: real-time delivery over `/ws-raw` with JWT CONNECT + SUBSCRIBE auth; reconnect after drop.
6. **Release build**: `keystore.properties` signing (watch for the loud debug-key warning), `usesCleartextTraffic=false`, https API base URL.
7. **Uploads**: camera photo >1MB succeeds (multipart 5MB + client compression); broken-image fallback rendering.

## 4. Test-debt backlog (P3)

- Contract smoke suite (mobile ↔ backend) in CI — the E2E script is a strong starting point.
- Concurrent-claim stress test with >2 concurrent claimants (current integration test covers pairwise).
- authStore 401/refresh unit tests; wsClient reconnect tests.
- PostGIS geo-query correctness test with multi-point datasets (distance ordering assertions).
