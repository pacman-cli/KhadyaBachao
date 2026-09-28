# API_DOCUMENTATION.md — Khadya Bachao Backend

Base URL (dev): `http://localhost:8080` · Swagger UI: `/swagger-ui.html` (disabled under the `prod` profile)
Auth: `Authorization: Bearer <JWT>` on every endpoint except the public ones marked below.
Error format: RFC 7807 `application/problem+json` (`type`, `title`, `status`, `detail`, `instance`).

Status-code contract: `400` invalid request · `401` missing/invalid JWT or deactivated user · `403` wrong role/ownership · `404` not found · `409` conflict (duplicate claim/rating, pending verification, token owned by another user) · `429` rate limited (20 write/auth req/min per IP by default, `RATE_LIMIT_MAX_REQUESTS`) · `500` unexpected (never leaks stack traces).

---

## 1. Health & auth (public)

| Method | Path | Auth | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/health` | none | — | `{status:"UP", service, timestamp}` | — |
| POST | `/api/auth/verify-token` | none | `{"idToken": "<Firebase ID token>"}` | `{accessToken, user, newUser}` | 400 invalid token; 503 if Firebase not enabled |
| POST | `/api/auth/refresh` | none (valid JWT in body) | `{"accessToken"}` | `{accessToken}` | 400 |
| POST | `/api/auth/dev/login` | none (**dev only** — absent when `FIREBASE_ENABLED=true` or profile `prod`) | `{"email","name"[,"role"]}` — role never ADMIN | `{accessToken, newUser}` | 400 |

## 2. Users

| Method | Path | Auth | Role | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/users/me` | JWT | any | — | `UserResponse` (id, name, email, phone, role, verified, …; no `firebaseUid`) | 401 |
| PUT | `/api/users/me` | JWT | any | `{name?, phone?, profilePhotoUrl?}` | `UserResponse` | 400 |
| PUT | `/api/users/me/role` | JWT | any | `{"role": "DONOR\|RECIPIENT_NGO\|RECIPIENT_INDIVIDUAL\|VOLUNTEER"}` | `UserResponse` | 400 — **ADMIN is never self-assignable (B15)** |

## 3. Listings

| Method | Path | Auth | Role | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/listings` | JWT | DONOR | `{title, description?, foodType: "COOKED\|PACKAGED\|RAW", quantityValue>0, quantityUnit, photoUrls[≤10], preparedAt?, pickupDeadline (future), pickupLat, pickupLng, pickupAddress?}` | 201 `ListingResponse` (status `AVAILABLE`) | 400 validation / past deadline / bad lat-lng |
| GET | `/api/listings/{id}` | JWT | any | — | `ListingResponse` | 404 |
| PUT | `/api/listings/{id}` | JWT | owner DONOR | same as create | `ListingResponse` (refreshing an EXPIRED listing with a future deadline re-opens it) | 400/403/404 |
| DELETE | `/api/listings/{id}` | JWT | owner DONOR | — | 204 | 403/404 |
| PATCH | `/api/listings/{id}/cancel` | JWT | owner DONOR | — | `ListingResponse` (CANCELLED) | 403/404 |
| GET | `/api/listings/mine` | JWT | DONOR | — | `ListingResponse[]` | 401 |
| GET | `/api/listings/nearby` | JWT | any | query: `lat`, `lng` (required), `radiusKm`/`maxDistanceKm` (0.1–100), `foodType`, `minQuantity`, `maxQuantity`, `includeExpired` (ADMIN only), `page`, `size` | `ListingResponse[]` sorted by real PostGIS distance | 400/401 |
| GET | `/api/listings` | JWT | any | query: `status`, `foodType`, `minQuantity`, `maxQuantity`, `page`, `size` | `Page<ListingResponse>` | 400 |

## 4. Claims / requests / ratings

| Method | Path | Auth | Role | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/listings/{id}/claim` | JWT | RECIPIENT_* / VOLUNTEER | — | 201 `RequestResponse`; first claim **auto-accepts**, listing → `CLAIMED` | 409 already claimed / expired / cancelled; 400 past deadline |
| GET | `/api/requests/mine` | JWT | any | — | `RequestResponse[]` | 401 |
| GET | `/api/listings/{id}/requests` | JWT | owner DONOR | — | `RequestResponse[]` | 403/404 |
| POST | `/api/requests/{id}/approve` (alias `/api/claims/{id}/approve`) | JWT | owner DONOR | — | `RequestResponse` (ACCEPTED) | 403/404/409 state guards |
| POST | `/api/requests/{id}/reject` (alias `/api/claims/{id}/reject`) | JWT | owner DONOR | — | `RequestResponse` (REJECTED, listing re-opens) | 403/404/409 |
| PATCH | `/api/requests/{id}/cancel` | JWT | recipient | — | `RequestResponse` (CANCELLED, listing re-opens) | 403/404/409 |
| PATCH | `/api/requests/{id}/complete` | JWT | owner DONOR | — | `RequestResponse`; listing → `COMPLETED` + `completedAt` (request stays ACCEPTED by design; completion lives on the listing) | 403/404/409 |
| POST | `/api/requests/{id}/rate` | JWT | participant, request ACCEPTED | `{"rating": 1–5, "comment?"}` | 201 `RatingResponse` | 400 bounds; 409 one rating per rater per request; 403 non-participant |
| GET | `/api/requests/{id}/ratings` | JWT | participant (guard B30) | — | `RatingResponse[]` | 403/404 |
| GET | `/api/requests/{id}/ratings/mine` | JWT | participant | — | `RatingResponse` | 403/404 |
| GET | `/api/requests/{id}/receipt` | JWT | participant | — | `application/pdf` receipt (completed requests only) | 403/404/409 |

## 5. Chat & pickup scheduling (participant-gated by `RequestAccessGuard`)

| Method | Path | Auth | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/requests/{id}/messages` | JWT | `{"message" ≤ 4000}` | 201 `MessageResponse`; broadcast to WS topic + push/SMS notifications | 400/403/404 |
| GET | `/api/requests/{id}/messages` | JWT | query `page` | `Page<MessageResponse>` (newest first) | 403/404 |
| GET | `/api/requests/{id}/schedule` | JWT | — | `ScheduleResponse` (incl. `donorId`, `recipientId`, per-party confirm flags) | 404 when none |
| POST | `/api/requests/{id}/schedule` | JWT | `{"agreedTime" (future), "agreedLocation"}` | `ScheduleResponse` (PROPOSED) | 400/403/404 |
| PATCH | `/api/requests/{id}/schedule/confirm` | JWT | — | `ScheduleResponse`; CONFIRMED when both parties confirmed | 403/404/409 |

## 6. WebSocket (STOMP)

- Endpoints: `/ws` (SockJS) and `/ws-raw` (pure STOMP). Broker prefix `/topic`, app prefix `/app`.
- **CONNECT** requires `Authorization: Bearer <JWT>` header (client sends `connectHeaders`).
- **SUBSCRIBE** authorization (B18): `/topic/chat/{requestId}` requires an authenticated principal **and** participation in that request; `/topic/listing/*` and `/topic/discover` are public broadcast topics (listing id/status only, no PII).
- **SEND** `/app/chat/{requestId}` `{"message": "..."}` — participant-gated; persists + broadcasts. The mobile client sends via REST first (authoritative) and uses the subscription for live delivery.

## 7. Notifications & devices

| Method | Path | Auth | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/devices/register` | JWT | `{"token" ≤4096, "platform": "ANDROID\|IOS\|WEB"}` | 200; **409** if the token is already owned by another user (B34) | 400 |
| GET | `/api/notifications` | JWT | query `page` | `Page<NotificationResponse>` (owner-scoped) | 401 |
| GET | `/api/notifications/unread-count` | JWT | — | `{count}` | 401 |
| PATCH | `/api/notifications/{id}/read` | JWT | — | 200 (owner-scoped) | 403/404 |
| PATCH | `/api/notifications/read-all` | JWT | — | 200 | 401 |

Dispatch provider: FCM when `FIREBASE_ENABLED=true` (+ credentials), otherwise a dev-log provider. Recipients: the other party of a claim/chat/schedule event, nearby verified recipients on new listings, applicants on verification decisions. Deactivated users are never notified.

## 8. Uploads

| Method | Path | Auth | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/uploads` | JWT | multipart `file` (≤5MB; JPEG/PNG/WebP by **magic-byte sniffing** — declared type must match actual bytes) | `{url}` (local `/uploads/<uuid>.<ext>` — publicly served; R2/Firebase public URL when configured) | 400 not an image / mismatch; 413 >5MB |

## 9. Verification (NGO)

| Method | Path | Auth | Role | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/verification/submit` (alias `/api/organization/verify-request`) | JWT | any | `{orgName, orgType?, registrationDocUrl}` | `VerificationResponse` (PENDING); **409 if already PENDING** (B46); resubmission allowed after rejection | 400 |
| GET | `/api/verification/me` | JWT | any | — | `VerificationResponse` | 404 |
| GET | `/api/admin/verifications` (alias `/api/admin/organizations/pending`) | JWT | ADMIN | query `status` (default PENDING), `page` | `Page<VerificationResponse>` | 403 |
| PATCH | `/api/admin/verifications/{id}/approve` | JWT | ADMIN | — | `VerificationResponse`; sets applicant `verified=true` + push | 403/404 |
| PATCH | `/api/admin/verifications/{id}/reject` | JWT | ADMIN | — | `VerificationResponse`; rejection never un-verifies (conservative by design) | 403/404 |

## 10. Reports & admin

| Method | Path | Auth | Role | Request | Response | Errors |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/reports` | JWT | any | `{"targetType": "LISTING\|USER", "targetId": UUID, "reason" ≤1000}` | 201 `ReportResponse` (createdAt populated) | 400/404 |
| GET | `/api/admin/reports` | JWT | ADMIN | query `status` (OPEN/RESOLVED/DISMISSED), `page` | `Page<ReportResponse>` | 403 |
| PATCH | `/api/admin/reports/{id}/resolve` | JWT | ADMIN | — | 200; LISTING reports auto-cancel the reported listing | 403/404 |
| PATCH | `/api/admin/reports/{id}/dismiss` | JWT | ADMIN | — | 200 | 403/404 |
| POST | `/api/admin/users/{id}/deactivate` | JWT | ADMIN | — | 200; user's JWTs stop working immediately (per-request active check) | 403/404 |
| POST | `/api/admin/users/{id}/reactivate` | JWT | ADMIN | — | 200 | 403/404 |
| GET | `/api/admin/metrics` | JWT | ADMIN | — | platform counters | 403 |

## 11. Stats

| Method | Path | Auth | Response | Notes |
| --- | --- | --- | --- | --- |
| GET | `/api/stats/me` | JWT | `{role, listingsPosted, pickupsCompleted, quantityRescued, claimsMade, …}` | counts **completed** pickups only |
| GET | `/api/stats/system` (alias `/api/stats/summary`) | none | system-wide rescue aggregates + 14-day trend + donor leaderboard | aggregates only |
| GET | `/api/stats/organization/{id}` | JWT | org-level counts | counts only, no PII |

---

## Mobile ↔ backend contract notes

- All dates are ISO-8601 UTC `Instant`s; the app renders them in device-local time.
- `RequestResponse.status` is the *request* status (`PENDING/ACCEPTED/REJECTED/CANCELLED`); handover completion is reflected on the *listing* (`COMPLETED` + `completedAt`) — the mobile screens read it from there.
- `ScheduleResponse` now includes `donorId`/`recipientId` so the chat screen can show per-user confirmation state (M21).
- Local upload URLs (`/uploads/...`) are converted to absolute URLs by the mobile API layer and are publicly readable, matching cloud-provider behavior.
