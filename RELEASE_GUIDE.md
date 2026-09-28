# Khadya Bachao Production Release Guide

## 1. Environment Setup

### 1.1 PostgreSQL 16
- Install/Provision PostgreSQL 16 instance.
- Create production database and user:
  ```sql
  CREATE DATABASE khadyabachao;
  CREATE USER khadya WITH ENCRYPTED PASSWORD 'YOUR_SECURE_DB_PASSWORD';
  GRANT ALL PRIVILEGES ON DATABASE khadyabachao TO khadya;
  ```
- Schema migrations run automatically via Flyway on backend startup.

### 1.2 Firebase Setup (Push Notifications)
- Go to Firebase Console -> Project Settings -> Service Accounts.
- Generate new private key JSON file.
- Save file to secure server path (e.g. `/etc/khadyabachao/firebase-service-account.json`).
- Set backend environment variables:
  - `FIREBASE_ENABLED=true`
  - `FIREBASE_CREDENTIALS_PATH=/etc/khadyabachao/firebase-service-account.json`

### 1.3 Google Maps API Key (Mobile App)
- Obtain API key from Google Cloud Console with Maps SDK for Android enabled.
- Add key to `mobile/android/app/src/main/AndroidManifest.xml`:
  ```xml
  <meta-data
      android:name="com.google.android.geo.API_KEY"
      android:value="YOUR_GOOGLE_MAPS_API_KEY" />
  ```

### 1.4 Production Environment Variables
Generate strong 256-bit secret key (minimum 32 characters):
```bash
openssl rand -base64 32
```

Configure environment variables on production server:
```env
DB_HOST=postgres-prod.internal
DB_PORT=5432
DB_NAME=khadyabachao
DB_USER=khadya
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD
SERVER_PORT=8080
UPLOAD_DIR=/var/lib/khadyabachao/uploads
JWT_SECRET=YOUR_GENERATED_JWT_SECRET_32_CHARS_MIN
JWT_EXPIRATION_MS=86400000
FIREBASE_ENABLED=true
FIREBASE_CREDENTIALS_PATH=/etc/khadyabachao/firebase-service-account.json
CORS_ALLOWED_ORIGINS=https://khadyabachao.com,https://admin.khadyabachao.com
```

---

## 2. Backend Deployment

### 2.1 Docker Build
Run from `backend/`:
```bash
docker build -t khadyabachao-backend:latest -f Dockerfile .
```

### 2.2 Docker Compose Production Deployment
Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    image: khadyabachao-backend:latest
    restart: always
    ports:
      - "8080:8080"
    environment:
      DB_HOST: ${DB_HOST}
      DB_PORT: ${DB_PORT}
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      SERVER_PORT: 8080
      UPLOAD_DIR: /app/uploads
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRATION_MS: ${JWT_EXPIRATION_MS}
      FIREBASE_ENABLED: ${FIREBASE_ENABLED}
      FIREBASE_CREDENTIALS_PATH: /app/firebase-key.json
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS}
    volumes:
      - khadya_uploads:/app/uploads
      - ${FIREBASE_CREDENTIALS_PATH}:/app/firebase-key.json:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  khadya_uploads:
```

Deploy backend:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 3. Mobile App Release Build (Android)

### 3.1 Key-store Setup
1. Generate release keystore:
   ```bash
   keytool -genkey -v -keystore release.keystore -alias khadya-key -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Move keystore to `mobile/android/app/release.keystore`.
3. Create `mobile/android/key.properties`:
   ```properties
   storePassword=YOUR_STORE_PASSWORD
   keyPassword=YOUR_KEY_PASSWORD
   keyAlias=khadya-key
   storeFile=release.keystore
   ```

### 3.2 Build APK / AAB
Run from `mobile/android`:
```bash
./gradlew assembleRelease
./gradlew bundleRelease
```
- APK output: `mobile/android/app/build/outputs/apk/release/app-release.apk`
- AAB output: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

---

## 4. Post-Deployment Security & Smoke Test Checklist

### Security Checklist
- [ ] `DB_PASSWORD` updated from default `khadya`.
- [ ] `JWT_SECRET` updated from default (minimum 32 random characters).
- [ ] `CORS_ALLOWED_ORIGINS` restricted to exact production domains (no wildcard `*`).
- [ ] Key property files (`key.properties`, `release.keystore`) excluded from Git tracking (`.gitignore`).
- [ ] TLS/SSL enabled on public endpoints (HTTPS on port 443 via reverse proxy).
- [ ] Docker container verified running under non-root `app` user.

### Smoke Test Checklist
1. **Backend Health Check**: `curl -i https://api.khadyabachao.com/api/health` (Must return `200 OK`).
2. **Auth Flow**: Register new donor account -> Login -> Verify JWT token returned.
3. **Food Listing Flow**: Create new food listing -> Verify image upload saved.
4. **Claim Flow**: Register receiver account -> Claim active listing -> Verify claim status updates.
5. **Push Notifications**: Trigger status update -> Verify FCM notification received on test device.
