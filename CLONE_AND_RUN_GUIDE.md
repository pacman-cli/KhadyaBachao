# Developer Onboarding & Local Setup Guide — Khadya Bachao

Welcome to **Khadya Bachao** (Smart Food Surplus Redistribution System).

This guide walks you through setting up the complete monorepo on your local machine after cloning the repository.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:

- **Git** (`git --version`)
- **Docker & Docker Compose** (`docker compose version`) — required for PostgreSQL 16 + PostGIS
- **Java 17 JDK** (`java -version`) — required for Spring Boot backend
- **Node.js >= 20** (`node -version`) & **npm** (`npm -version`)
- **Android Studio & Android SDK** with an Android Virtual Device (AVD, e.g., Pixel 6a) — required for mobile app testing

---

## 2. Clone the Repository

```bash
git clone https://github.com/pacman-cli/KhadyaBachao.git
cd KhadyaBachao
```

---

## 3. Backend Setup (`backend/`)

### A. Environment Configuration

Copy the example environment file:

```bash
cp backend/.env.example backend/.env.local
```

Ask the project maintainer/lead for the private credentials or generate your own for local testing:

- `JWT_SECRET`: A 64+ character random string (generate with `openssl rand -base64 64`).
- `FIREBASE_CREDENTIALS_PATH`: Place your Firebase Admin SDK JSON key file at `backend/firebase-service-account.json` (and set `FIREBASE_ENABLED=true` in `.env.local`).
- `CLOUDFLARE_R2_*`: (Optional) Fill in your Cloudflare R2 bucket credentials if using cloud image storage.

### B. Start PostgreSQL Database

Start PostgreSQL with PostGIS pre-configured via Docker Compose:

```bash
docker compose up -d postgres
```

> **Note:** Mapped to host port **5433** to avoid conflicts with local Postgres installations on 5432.

### C. Run the Backend API

```bash
cd backend
set -a; source .env.local; set +a
./mvnw spring-boot:run
```

Verify backend health:

- **Health Endpoint:** `http://localhost:8080/api/health`
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`

---

## 4. Mobile App Setup (`mobile/`)

### A. Environment Configuration

Copy the mobile example environment file:

```bash
cp mobile/.env.example mobile/.env
```

Edit `mobile/.env`:

```env
# Use 10.0.2.2 for Android Emulator (points to host localhost:8080)
# Or use your machine's LAN IP (e.g., http://192.168.1.5:8080) for physical devices
API_BASE_URL=http://10.0.2.2:8080

# Google Web Client ID (from Firebase Console -> Authentication -> Google -> Web client ID)
GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com

FIREBASE_ENABLED=true
```

Place your `google-services.json` file inside:

```
mobile/android/app/google-services.json
```

### B. Google Maps Key (Android)

Add your Google Maps API key (restricted to package `com.khadyabachao` and your debug SHA-1) in your global Gradle properties:

```bash
mkdir -p ~/.gradle
echo "googleMapsApiKey=YOUR_GOOGLE_MAPS_API_KEY" >> ~/.gradle/gradle.properties
```

### C. Install Dependencies & Launch Mobile App

```bash
cd mobile
npm install
```

Launch the Android Emulator from Android Studio or via CLI:

```bash
~/Library/Android/sdk/emulator/emulator -avd Pixel_6a &
```

Set the emulator location to Dhaka, Bangladesh (e.g. Latitude `23.8103`, Longitude `90.4125`) via emulator Extended Controls (`...` -> Location).

Build and run the app:

```bash
npx react-native run-android
```

---

## 5. Running Tests

### Backend Tests

```bash
cd backend
./mvnw -B verify
```

### Mobile Tests & Linting

```bash
cd mobile
npx tsc --noEmit     # TypeScript type check
npm test             # Jest unit tests
```

### Live End-to-End Smoke Test

Run the automated 59-check system smoke test against a running backend and PostgreSQL database:

```bash
bash backend/e2e/e2e_smoke.sh
```

---

## 6. Pre-seeded Demo Accounts

For dev mode testing without Firebase, use the pre-seeded accounts detailed in [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md).

---

## 7. Troubleshooting

- **Port 8080 in use:** Stop conflicting services or change `SERVER_PORT=18080` in `backend/.env.local` and update `API_BASE_URL` in `mobile/.env`.
- **Google Sign-In DEVELOPER_ERROR:** Ensure your debug SHA-1 fingerprint is added to the Android App under Firebase Console Project Settings and `google-services.json` is updated.
- **Location / Map Crashes:** Ensure `enableHighAccuracy: true` is enabled and native Google Maps API key is configured.
