# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (`backend/`)
- **Run dev server**: `DB_PORT=5433 ./mvnw spring-boot:run`
- **Run unit & integration tests**: `./mvnw test` (requires Docker for Testcontainers)
- **Run single test class**: `./mvnw test -Dtest=ListingControllerTest`
- **Run single test method**: `./mvnw test -Dtest=ListingControllerTest#testCreateListing`
- **Build package**: `./mvnw clean package -DskipTests`

### Mobile (`mobile/`)
- **Start Metro bundler**: `npm start`
- **Run Android dev**: `npm run android`
- **Typecheck**: `npx tsc --noEmit`
- **Lint**: `npm run lint`
- **Run unit tests**: `npm test`
- **Run single test file**: `npx jest __tests__/AuthContext.test.tsx`
- **Build Android release APK**: `cd android && ./gradlew assembleRelease`

### Infrastructure (`/`)
- **Start Postgres database**: `docker compose up -d postgres` (maps to host port 5433)
- **Run full stack in Docker**: `JWT_SECRET='<64+ chars>' docker compose --profile full up -d --build`

## Architecture & Structure

This repository is a monorepo for **Khadya Bachao**, a food surplus redistribution system connecting donors, recipients/NGOs, and admins.

### Core Stack & Layers

- **Backend (`backend/`)**: Spring Boot 3.5, Java 17, Spring Security, JPA/Hibernate, PostgreSQL 16, Flyway.
  - **Auth**: Stateless JWT with sliding session (`/api/auth/refresh`). Firebase Admin SDK for production ID tokens; falls back to `/api/auth/dev/login` when `FIREBASE_ENABLED=false`.
  - **Database Migrations**: Flyway scripts under `src/main/resources/db/migration/V*__*.sql`.
  - **Real-time**: WebSocket STOMP for chat and live status updates.
  - **Storage**: Local filesystem uploads (`uploads/`) in dev mode.

- **Mobile (`mobile/`)**: React Native 0.87 (TypeScript, React 19, React Navigation 7).
  - **State Management**: Zustand stores in `src/store/` for Auth, Donation, Map, and Notifications.
  - **HTTP Layer**: Axios client in `src/api/` with automatic JWT header injection and token refresh.
  - **Native Features**: `react-native-maps`, FCM push notifications.
  - **API Endpoint Target**: Dev backend defaults to `http://10.0.2.2:8080` (Android emulator host mapping).
