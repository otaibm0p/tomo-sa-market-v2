# TOMO Driver App — Production Readiness Report

## What Changed

### 0) Baseline
- **TypeScript:** Fixed missing `setOnUnauthorized` in `lib/api.ts`, `clearSession` in `store/authStore.ts`, and unsupported `tabBarDirection` in tabs layout.
- **API:** Added `getApiBase()` as single source of truth: `EXPO_PUBLIC_API_URL` or dev fallback `http://localhost:3000`, production fallback `https://api.tomo-sa.com` with one-time console warn if unset in production.
- **Auth:** 401 interceptor clears token and calls `onUnauthorized` (set from root layout) to clear session and redirect to `/login`. Boot gate: index screen shows spinner until `hydrated` is true, then redirects to tabs or login.

### 1) Assets & Config
- **app.json:** Splash image set to `./assets/splash.png`. `ios.bundleIdentifier`: `com.tomo.driver`, `android.package`: `com.tomo.driver` (unchanged).
- **Placeholders:** Added `scripts/generate-placeholder-assets.js` to create minimal PNGs for `icon.png`, `splash.png`, `adaptive-icon.png` if missing. Run: `node scripts/generate-placeholder-assets.js`.

### 2) Environment
- **lib/api.ts:** `getApiBase()` reads `EXPO_PUBLIC_API_URL`; dev uses `http://localhost:3000`, production uses `https://api.tomo-sa.com` with optional one-time warn. Axios instance uses this base URL once at load.

### 3) Auth & Session
- **authStore:** `hydrated` in state; `clearSession()` sync clear (no async). Hydration sets `hydrated: true` after token check / me fetch.
- **401:** Interceptor clears stored token and invokes `setOnUnauthorized` callback (clearSession + router.replace('/login')). Callback cleared after use to avoid loops.
- **Boot gate:** Root index waits for `hydrated` before navigating; shows loading spinner until then.

### 4) Location
- **Permission UX:** When user toggles Online ON, `startLocationUpdates()` runs; if permission denied it returns `false`, toast shows Arabic message (`locationPermissionDenied`) and toggle stays OFF.
- **Last location sent:** Home shows “Last location sent” row with timestamp when location was last sent to API. `setOnLocationSent` in `lib/location.ts` used to update state.
- **Foreground only:** Location updates remain foreground (expo-location). Background tracking left as scaffold (expo-task-manager not added; OFF by default).

### 5) Notifications
- **expo-notifications:** Request permission and get Expo push token. Profile has “Enable notifications” button; on press, `registerPushToken()` runs (request permission, get token, POST to backend stub).
- **Stub:** `POST /api/driver/push-token` in `lib/api.ts` (`postDriverPushToken`); fails silently. Token not persisted server-side until backend implements.

### 6) UI
- **Typography:** Slightly larger and stronger contrast in `constants/typography.ts` (title 24, title2 19, body 17, caption 15).
- **Buttons:** Primary TOMO green `#047857`, danger red. Cards: consistent padding, shadow, border (unchanged).
- **RTL:** Login and all screens use `isRTL()` and `dir`/layout; Arabic default preserved.

### 7) EAS & Scripts
- **eas.json:** development (internal) and production (store) profiles; production env `EXPO_PUBLIC_API_URL=https://api.tomo-sa.com`.
- **package.json:** `build:dev`, `build:prod` scripts.
- **README:** How to set `EXPO_PUBLIC_API_URL` for local testing; EAS build commands.

### 8) Logging & Guards
- **Production URL:** One-time `console.warn` in production if `EXPO_PUBLIC_API_URL` is not set.
- **Stubs:** All stub API calls (push token, order status, etc.) fail silently (no throw to user) or show toast where appropriate.

---

## How to Run Locally

```bash
cd tomo-driver-app
npm install
npx expo start
```

- Optional: `cp env.example .env` and set `EXPO_PUBLIC_API_URL=http://localhost:3000` for local API.
- Android: press `a` or scan QR with Expo Go. iOS: press `i` or scan QR.

---

## How to Build with EAS

```bash
npm install -g eas-cli
eas login
npm run build:dev    # development (internal)
npm run build:prod   # production (store)
```

- Production profile sets `EXPO_PUBLIC_API_URL=https://api.tomo-sa.com`.
- Ensure `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png` exist (run `node scripts/generate-placeholder-assets.js` if missing).

---

## Current Stubs & Expected Backend

| Endpoint | App usage | Backend expected |
|----------|-----------|-------------------|
| `POST /api/driver/auth/login` | Login | phone, password → token, driver |
| `GET /api/driver/me` | Profile, home | → driver info |
| `POST /api/driver/status` | Online/available toggles | online, available |
| `POST /api/driver/location` | Foreground location updates | latitude, longitude |
| `GET /api/driver/orders/active` | Order tab | → list of active orders |
| `POST /api/driver/orders/:id/status` | Step buttons | status (e.g. PICKED_UP, DELIVERED) |
| `POST /api/driver/push-token` | Notifications | token (Expo push token) |

Stubs: login/me return mock data on 404 or network error; status, location, orders, order status, push-token fail or no-op gracefully without breaking the app.
