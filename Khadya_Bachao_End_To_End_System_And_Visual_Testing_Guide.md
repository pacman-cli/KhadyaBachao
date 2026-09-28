# Khadya Bachao — End-to-End System & Visual Testing Guide

This guide provides step-by-step instructions to run, visually inspect, and test the complete **Khadya Bachao** system end-to-end.

---

## 1. Quick Start Guide (3-Step Launch)

### Step 1: Start PostgreSQL Database
Open a terminal in the repository root and run:

```bash
docker compose up -d postgres
```
> **Note**: Mapped to host port `5433` to prevent port conflicts with standard PostgreSQL instances running on `5432`.

### Step 2: Launch Spring Boot Backend
Open a second terminal window and run:

```bash
cd backend
DB_PORT=5433 ./mvnw spring-boot:run
```

#### Verification Endpoints:
- **API Health Check**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **Interactive Swagger UI**: [http://localhost:8080/swagger-ui.html](http://localhost:8080/swagger-ui.html)

> **Dev Mode Authentication**: Without Firebase credentials configured (`FIREBASE_ENABLED=false`), the backend runs in **dev mode**, allowing instant JWT generation via `POST /api/auth/dev/login`.

### Step 3: Launch Mobile Application
Open a third terminal window and run:

```bash
cd mobile
npm install
npm run android
```

#### Android Environment Prerequisites & Manual Fixes:
If running `npm run android` fails with errors like `/bin/sh: adb: command not found` or `No connected devices!`:

1. **Set Android SDK Environment Variables**:
   Add the Android SDK tools to your shell configuration (`~/.zshrc` or `~/.bashrc`):
   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk # macOS default
   export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin
   ```
   Apply changes: `source ~/.zshrc`

2. **Launch an Android Emulator or Connect Physical Device**:
   - **Option A (Android Studio)**: Open Android Studio -> Device Manager -> Click **Play** next to your Virtual Device (e.g. Pixel 8 API 34).
   - **Option B (Command Line)**:
     ```bash
     emulator -list-avds
     emulator -avd <YOUR_AVD_NAME>
     ```
   - **Option C (Physical Device)**: Enable **Developer Options** and **USB Debugging** on your phone, then connect via USB.

3. **Verify ADB Connection**:
   ```bash
   adb devices
   ```
   *Expected output*:
   ```text
   List of devices attached
   emulator-5554	device
   ```

4. **Retry Mobile App Build**:
   ```bash
   npm run android
   ```

---

## 2. End-to-End Visual Testing Workflows

### Workflow 1: Food Donor Flow (Posting Surplus Food)
1. Open mobile app -> Tap **Dev Quick Login**.
2. Select role: `DONOR`.
3. Navigate to **Post Food** tab:
   - Select or capture a food photo.
   - Enter details: Title (e.g., *"20 Biryani Packets"*), Quantity, Food Type (*COOKED* / *PACKAGED* / *RAW*).
   - Set pickup deadline and adjust map location marker.
   - Tap **Post Surplus Food**.
4. Go to **My Listings** tab to confirm the posting appears as `AVAILABLE`.

### Workflow 2: Food Recipient Flow (Discovery & Claiming)
1. Log out or switch user context.
2. Login with role: `RECIPIENT_INDIVIDUAL` or `RECIPIENT_NGO`.
3. Open **Discover** screen:
   - Toggle between **Map View** (interactive food markers) and **List View**.
   - Adjust distance radius slider to filter nearby food postings.
4. Tap the food posting -> Tap **Claim Food**.
5. Navigate to **My Claims** tab to view the request status (`ACCEPTED`).

### Workflow 3: Real-Time Messaging & Handover Completion
1. Tap the claimed listing in **My Claims** -> Open **In-App Chat**.
2. Send messages (delivered in real time via STOMP WebSocket connection).
3. Switch user context back to **Donor**:
   - Go to **My Listings** -> Tap **Confirm Pickup**.
4. Switch back to **Recipient**:
   - Go to **My Claims** -> Rate donor (1 to 5 stars + optional comment) in the rating modal.

### Workflow 4: Admin Moderation & Impact Analytics
1. Log in with role: `ADMIN`.
2. Open **Admin Screen**:
   - **Dashboard**: View system-wide impact metrics (total kg rescued, top donor leaderboards).
   - **Verification**: Review pending NGO registration documentation.
   - **Moderation**: View reported listings/users and take resolution actions.

---

## 3. Automated & System Testing

### Backend Unit & Integration Tests
```bash
cd backend
./mvnw test
```

### Mobile Typecheck & Linting
```bash
cd mobile
npx tsc --noEmit
npm run lint
```
