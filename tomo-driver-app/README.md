# TOMO Driver App

Production-grade React Native driver app (Expo + EAS). Arabic-first, RTL-ready.

## Stack

- **Expo** (SDK 52) + **expo-router** (file-based routing)
- **TypeScript**, **React Query**, **Zustand**, **Axios**
- **expo-secure-store** (JWT), **expo-location** (background, permission-guarded), **expo-notifications** (push scaffold)
- i18n: AR (default) / EN

## Screens

| Route | Description |
|-------|-------------|
| `/login` | Phone + password, show/hide password (eye icon), loading, error toast |
| `/(tabs)/home` | Online/offline toggle, available/busy toggle, lastSeen, connection indicator; starts/stops location when online |
| `/(tabs)/order` | Active order details + step buttons (picked_up, delivering, delivered) |
| `/(tabs)/profile` | Driver info + logout |

## Setup & Run

```bash
cd tomo-driver-app
npm install
npx expo start
```

- **Android:** press `a` in terminal or scan QR with Expo Go.
- **iOS:** press `i` or scan QR (Expo Go / Simulator).

## Environment

- **Local:** Create `.env` (or set in shell) with `EXPO_PUBLIC_API_URL=http://localhost:3000` for dev. If unset, dev uses `http://localhost:3000`.
- **Production:** EAS production profile sets `EXPO_PUBLIC_API_URL=https://api.tomo-sa.com`.

```bash
cp env.example .env
# Edit .env: EXPO_PUBLIC_API_URL=http://localhost:3000  (for local API)
```

## EAS Build

```bash
npm install -g eas-cli
eas login
npm run build:dev    # development (internal)
npm run build:prod   # production (store)
```

## API (stubs if backend missing)

- `POST /api/driver/auth/login` — phone, password
- `GET /api/driver/me`
- `POST /api/driver/status` — online, available
- `POST /api/driver/location` — latitude, longitude
- `GET /api/driver/orders/active`
- `POST /api/driver/orders/:id/status` — status (stub)

JWT stored in expo-secure-store; axios interceptor adds `Authorization: Bearer <token>`.

## Design

- Primary: TOMO green `#047857`
- Reusable components: `Button`, `Card`, `Badge`, `ScreenContainer`
- Typography and colors in `constants/colors.ts`, `constants/typography.ts`

## Assets

Ensure `assets/icon.png`, `assets/splash-icon.png`, and `assets/adaptive-icon.png` exist (e.g. 1024×1024 PNG for icon). If missing, add placeholders or update `app.json` paths.

## No Duplicates / Temp Files

- `.gitignore` excludes `node_modules/`, `.expo/`, `.env`, `*.log`, `.cache/`, etc.
- Do not commit `.env` or build artifacts.
