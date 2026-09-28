# AGENTS.md — Khadya Bachao

Monorepo: `backend/` (Spring Boot 3.5, Java 17) + `mobile/` (React Native 0.87, Node >= 22.11). No root build; run commands per package.

## Backend (`backend/`)

- Start DB first: `docker compose up -d postgres` (repo root). Host port is **5433**, not 5432.
- Run dev server (from `backend/`): `DB_PORT=5433 ./mvnw spring-boot:run`
  - `application.yml` defaults to `localhost:5432` — omitting `DB_PORT=5433` breaks local dev.
- Health: `http://localhost:8080/api/health` · Swagger: `http://localhost:8080/swagger-ui.html`
- Tests need Docker (Testcontainers Postgres). CI runs `./mvnw -B verify`:
  - All: `./mvnw test` · single class: `./mvnw test -Dtest=ListingControllerTest` · single method: `./mvnw test -Dtest=ListingControllerTest#testCreateListing`
- DB schema is Flyway-only (`src/main/resources/db/migration/V*__*.sql`); `ddl-auto: validate` — never hand-create tables or set `ddl-auto` to `update/create`, add a new `V*__*.sql` migration instead.
- Auth defaults to dev mode (`FIREBASE_ENABLED=false`): use `POST /api/auth/dev/login {"email","name"[,"role"]}` for a JWT. Prod path needs `FIREBASE_ENABLED=true` + `FIREBASE_CREDENTIALS_PATH`; dev endpoints disappear then.
- Uploads are local filesystem (`uploads/`, override via `UPLOAD_DIR`); 5MB, JPEG/PNG/WebP magic-type allowlist.
- Packages under `src/main/java/com.khadyabachao/`: `auth, user, listing, request, chat, notification, verification, stats, admin, config, common`. Real-time = WebSocket STOMP (chat + live status).

## Mobile (`mobile/`)

- Emulator backend URL is `http://10.0.2.2:8080` (`API_BASE_URL` in `.env`); on a physical device replace with host LAN IP.
- Verify order (matches CI `mobile-ci.yml`): `npx tsc --noEmit` → `npx eslint src App.tsx` → `npm test -- --watchAll=false`. Note `npm run lint` (`eslint .`) is broader than CI.
- Single test: `npx jest __tests__/AuthContext.test.tsx`
- `npm run android` hardcodes a macOS Android-SDK `PATH` export; on Linux/CI call `npx react-native run-android` directly.
- Native gotchas: Maps key via `GOOGLE_MAPS_API_KEY` env or `googleMapsApiKey` in `android/gradle.properties`; FCM is dormant until `google-services.json` is added + `FIREBASE_ENABLED=true` in `.env`. Release APK needs `android/keystore.properties` + keystore (gitignored, never commit); without it the build falls back to the debug key.
- Architecture: Zustand stores in `src/store/`, Axios client with JWT inject + refresh in `src/api/`, navigation in `src/navigation/`.

## Full stack / deploy

- Full Docker stack (repo root): `JWT_SECRET='<64+ chars>' docker compose --profile full up -d --build` (`backend` service only runs under `full` profile).
- Never commit secrets: `.env` files, `*-service-account.json`, `android/keystore*`, `key.properties`.
