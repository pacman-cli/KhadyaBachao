# Khadya Bachao — Codebase Gap Analysis & Audit Report

**Date**: September 16, 2026  
**Audited Target**: Monorepo (`backend/` & `mobile/`) against `/Users/md.ashikurrahmanpuspo/Downloads/Khadya_Bachao_Implementation_Plan (1).md`.

---

## Table of Contents

- [1. Project Structure Check](#1-project-structure-check)
- [2. Database Schema & Spatial PostGIS Audit](#2-database-schema--spatial-postgis-audit)
- [3. Feature-by-Feature Status Matrix](#3-feature-by-feature-status-matrix)
- [4. API Surface & Endpoint Comparison](#4-api-surface--endpoint-comparison)
- [5. Security, Cloud Storage & Cross-Cutting Concerns](#5-security-cloud-storage--cross-cutting-concerns)
- [6. Frontend (React Native) Audit](#6-frontend-react-native-audit)
- [7. Priority Summary Table](#7-priority-summary-table)

---

## 1. Project Structure Check

### Backend (`backend/src/main/java/com/khadyabachao/`)
- **Structure**: Clean domain-driven modular package hierarchy:
  - `admin/`: Moderation controllers, user deactivation, content abuse reports.
  - `auth/`: Firebase ID token verification, Dev mode token issuer, JWT refresh pipeline.
  - `chat/`: Real-time WebSocket STOMP chat controllers, message persistence, pickup schedule negotiator.
  - `config/`: Security filters, JWT service, WebSocket CORS & auth interceptors, IP rate limiter.
  - `listing/`: Food surplus creation, PostGIS & Haversine proximity search, automated expiry worker (`ListingExpiryJob`).
  - `notification/`: Device token registry, FCM push notification provider with local log fallback.
  - `request/`: Claims workflow, donor approval/rejection, handover completion, post-pickup ratings.
  - `stats/`: User impact metrics, system-wide food rescue statistics, donor leaderboards.
  - `user/`: User profiles, role selection (`DONOR`, `RECIPIENT_NGO`, `RECIPIENT_INDIVIDUAL`, `VOLUNTEER`, `ADMIN`).
  - `verification/`: NGO organization document upload, admin verification review queue.
  - `common/`: Cloud storage abstraction (`StorageService`, `LocalStorageService`, `FirebaseStorageService`), global error handler.

### Mobile App Navigation (`mobile/src/navigation/`)
- **Structure**: Native stack navigation (`RootNavigator.tsx`) with conditional rendering based on authentication state and user role.
- **HomeScreen**: Serves as a dynamic role-aware operational hub presenting role-specific actions (e.g., Post Food for Donors, Discover & Claim for Recipients, Verification & Reports for Admins).

---

## 2. Database Schema & Spatial PostGIS Audit

| Plan Table | Codebase Table | Migrations | PostGIS & Index Status | Compliance |
| :--- | :--- | :--- | :--- | :--- |
| `users` | `users` | `V1`, `V8`, `V12` | `id UUID`, `firebase_uid`, `role`, `is_verified`, `active`, `rating_avg` | **100% Compliant** |
| `verification_documents` | `organizations` | `V1`, `V12` | Linked via `user_id`, stores document URL (`registration_doc_url`) | **Compliant** |
| `food_listings` | `food_listings` | `V2`, `V9`, `V13` | **PostGIS Enabled**: `location GEOGRAPHY(POINT, 4326)` with **GIST spatial index** (`idx_food_listings_postgis_location`) via `V13__enable_postgis_geography.sql` + `earthdistance` fallback | **100% PostGIS Compliant** |
| `claims` | `food_requests` | `V4`, `V10` | `listing_id`, `recipient_id`, `status` (`PENDING`, `ACCEPTED`, `REJECTED`, `CANCELLED`) | **100% Compliant** |
| `pickup_schedules` | `pickup_schedules` | `V5`, `V10` | `request_id`, `agreed_time`, `agreed_location`, dual confirmation flags | **100% Compliant** |
| `chat_messages` | `chat_messages` | `V5`, `V10` | `request_id`, `sender_id`, `message`, `sent_at` | **100% Compliant** |
| `ratings` | `ratings` | `V6`, `V10` | `request_id`, `rated_user_id`, `rating` (1-5), `comment` | **100% Compliant** |
| `reports` | `reports` | `V8`, `V10` | `reporter_id`, `target_type` (`LISTING`/`USER`), `target_id`, `reason`, `status` | **100% Compliant** |
| `impact_stats` | `stats_daily` | `V7`, `V12` | Daily pre-aggregated rescue metrics + live query computation | **100% Compliant** |
| `device_tokens` | `device_tokens` | `V4`, `V10` | `user_id`, `token` (UNIQUE), `platform` (`ANDROID`/`IOS`/`WEB`) | **100% Compliant** |

---

## 3. Feature-by-Feature Status Matrix

1. **Auth (Firebase & Dev Mode)**: **IMPLEMENTED**  
   - *Evidence*: `AuthController.java`, `DevAuthController.java`, `FirebaseTokenVerifier.java`.  
   - Supports production Firebase ID token exchange and dev mode auto-provisioning.
2. **Food Posting Module**: **IMPLEMENTED**  
   - *Evidence*: `ListingController.java`, `FirebaseStorageService.java`, `LocalStorageService.java`.  
   - Supports photo uploads to free cloud storage (Firebase 5GB / R2 10GB free tier) or local disk.
3. **Food Discovery Module (PostGIS & Proximity)**: **IMPLEMENTED**  
   - *Evidence*: `V13__enable_postgis_geography.sql`, `ListingController.java`, `DiscoverScreen.tsx`.  
   - Spatial PostGIS search (`GEOGRAPHY(POINT)`) and zero-cost OpenStreetMap tiles rendering.
4. **Real-Time Matching & Notifications**: **IMPLEMENTED**  
   - *Evidence*: `FcmNotificationService.java`, `DeviceController.java`, `notifications.ts`.  
   - Sends live FCM push notifications for claim status updates, chat messages, and admin verifications.
5. **Pickup Scheduling & In-App Chat**: **IMPLEMENTED**  
   - *Evidence*: `ChatWsController.java`, `ChatController.java`, `ChatScreen.tsx`.  
   - STOMP WebSocket messaging at `/ws-chat` with persistence and mutual schedule confirmation.
6. **NGO Verification System**: **IMPLEMENTED**  
   - *Evidence*: `VerificationController.java`, `AdminScreen.tsx`.  
   - Document upload submission and admin approval queue.
7. **Impact Tracker Dashboard**: **IMPLEMENTED**  
   - *Evidence*: `StatsController.java`, `DashboardScreen.tsx`.  
   - User statistics, 14-day rescue trends, and donor leaderboard.
8. **Admin Panel**: **IMPLEMENTED**  
   - *Evidence*: `AdminController.java`, `ReportController.java`, `AdminScreen.tsx`.  
   - Moderation queue for open reports and user account suspension.
9. **Automated Expiry Job**: **IMPLEMENTED**  
   - *Evidence*: `ListingExpiryJob.java` (`@Scheduled(cron = "0 */15 * * * *")`).  
   - Automatically marks past-deadline listings as `EXPIRED`.
10. **Rating System**: **IMPLEMENTED**  
    - *Evidence*: `ClaimController.java`, `RatingService.java`.  
    - Ratings (1-5 stars) recalculate target user rating average.

---

## 4. API Surface & Endpoint Comparison

- `POST /api/auth/verify-token` — Exchange Firebase ID Token for JWT
- `POST /api/auth/refresh` — Sliding session JWT extension
- `POST /api/auth/dev/login` — Dev auth login (disabled when Firebase active)
- `GET /api/users/me` — Get profile
- `PUT /api/users/me/role` — Update role
- `POST /api/listings` — Create surplus food listing
- `GET /api/listings/nearby` — PostGIS / Haversine radius search
- `POST /api/listings/{id}/claim` — Claim food request
- `POST /api/claims/{id}/approve` — Approve claim
- `POST /api/requests/{id}/schedule` — Propose pickup time
- `PATCH /api/requests/{id}/schedule/confirm` — Confirm schedule
- `WS /ws-chat` — STOMP real-time WebSocket chat endpoint
- `POST /api/verification/submit` — Submit NGO registration doc
- `GET /api/admin/verifications` — List pending verifications
- `PATCH /api/admin/verifications/{id}/approve` — Approve verification
- `GET /api/stats/me` — User personal impact metrics
- `GET /api/stats/system` — Public system food rescue metrics
- `POST /api/uploads` — Upload image file (Firebase / R2 / Local)

---

## 5. Security, Cloud Storage & Cross-Cutting Concerns

- **Auth Security**: `JwtAuthFilter` validates Bearer token on every request. `SecurityConfig` enforces authentication globally.
- **Method Security**: `@PreAuthorize("hasAnyRole('DONOR','ADMIN')")` protects write endpoints. `@PreAuthorize("hasRole('ADMIN')")` protects admin moderation.
- **Rate Limiting**: `RateLimitFilter` limits `/api/auth/*` to 20 req/min per IP.
- **Cloud Storage**: Added `FirebaseStorageService` supporting free-tier Firebase Storage (5GB free) and Cloudflare R2 (10GB free/mo) alongside `LocalStorageService`.

---

## 6. Frontend (React Native) Audit

- **Map Rendering**: Updated `DiscoverScreen.tsx` to use free **OpenStreetMap tiles** via `<UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />`, eliminating Google API costs and native Android map crashes.
- **Push Handling**: Foreground & background notification listeners integrated via `@react-native-firebase/messaging`.
- **State & Network**: Zustand store (`useAuthStore`) + Axios HTTP client with Bearer token injection.

---

## 7. Priority Summary Table

| Feature Module | Implementation Status | Storage / Infrastructure | Priority |
| :--- | :--- | :--- | :--- |
| **Authentication & Dev Seed** | **IMPLEMENTED** | Firebase Auth ID Token + Dev Auth mode (`V12` seeded data) | **Done (100%)** |
| **Food Discovery & Spatial PostGIS** | **IMPLEMENTED** | Flyway `V13` PostGIS `GEOGRAPHY(POINT)` + OpenStreetMap free tiles | **Done (100%)** |
| **Cloud Storage** | **IMPLEMENTED** | `FirebaseStorageService` (5GB free) / Local fallback | **Done (100%)** |
| **Claims & Concurrency** | **IMPLEMENTED** | PostgreSQL pessimistic locking prevents double claims | **Done (100%)** |
| **Chat & Pickup Scheduling** | **IMPLEMENTED** | Spring WebSocket STOMP broker + mutual schedule confirmation | **Done (100%)** |
| **NGO Verification & Admin** | **IMPLEMENTED** | Admin moderation queue & document verification review | **Done (100%)** |
| **Impact Analytics & Expiry Job** | **IMPLEMENTED** | `ListingExpiryJob` + `StatsAggregationJob` daily cron | **Done (100%)** |

---

## 8. Firebase Security Rules & Secrets Hygiene (Audit Fixes, Sep 2026)

The `firebase-security-rules-auditor` audit scored the project **2/5 (Major)** because a live
Firebase project shipped with **no version-controlled security rules** and **Admin SDK private
keys sitting unignored** at the repo root. All findings have been fixed:

| Finding | Severity | Fix |
| :--- | :--- | :--- |
| No `*.rules`, `firebase.json`, or `.firebaserc` anywhere | Moderate | Added `firebase/firestore.rules`, `firebase/storage.rules`, and root `firebase.json` |
| Live project exposed to permissive console defaults | Major | Firestore = locked mode (deny-all client access); Storage = public read **only** on `uploads/*`, zero client writes |
| No CI gate for rules (drift/corruption risk) | Moderate | New `firebase-rules-ci` workflow: emulators compile the rules + 9 rules unit tests (`firebase/rules.test.js`) must pass |
| Admin SDK keys unignored in `api key/` | Major | Root `.gitignore` now excludes `api key/` — keys were never in git history; mobile builds use their own tracked configs (`mobile/android/app/google-services.json`, `mobile/ios/KhadyaBachao/GoogleService-Info.plist`) |
| Authority source (checklist #2) | — | Confirmed safe by design: roles/ownership derive from backend Postgres; clients only present Firebase ID tokens verified server-side by `FirebaseTokenVerifier` |

**Rules design contract** (pinned by tests):
- The app has **no client-side Firestore usage** — Firestore runs in locked mode (`allow read, write: if false`). If a future feature needs client Firestore access, add explicit per-collection match blocks with ownership + type/size validation per the auditor checklist.
- Storage is written **exclusively by the backend** via the Admin SDK (`FirebaseStorageService`), which bypasses rules; listing photos under `uploads/<uuid><ext>` are intentionally publicly readable to serve direct download URLs. Clients can never write, overwrite, or delete.

**Emulator verification** (local run, `firebase-tools@13`): all 9 tests pass —
`✔ Firestore rules: locked mode (4 tests)` · `✔ Storage rules: uploads/* public read, no client writes (5 tests)`.

**Deploying the rules** (one-time, requires Firebase login):

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,storage   # uses root firebase.json
```

**Remaining operational action (cannot be done from code): rotate the two
`khadyabachao-firebase-adminsdk-*.json` keys in the Firebase console → Project Settings →
Service Accounts, since they have been stored in a local folder alongside other documents.**
