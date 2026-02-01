# Login diagnosis and fix – Driver/Admin via Vite proxy

## Step 1 – Where the frontend sends requests

- **API client:** `frontend/src/utils/api.ts`
- **Base URL in dev:** `getApiBase()` returns `''` when `import.meta.env.DEV` is true, so requests go to same origin (e.g. `http://localhost:5173`).
- **Login call:** `authAPI.login()` uses `api.post('/api/auth/login', { email, password })` → full URL is **`/api/auth/login`** (not `/auth/login`).
- **Vite proxy:** `frontend/vite.config.js` proxies **`/api`** → **`http://localhost:3000`** (backend port 3000).

So the frontend calls `http://localhost:5173/api/auth/login`, Vite forwards to `http://localhost:3000/api/auth/login`. No change needed.

---

## Step 2 – Backend routes

- **POST /api/auth/login** – defined in `backend/server.js` (around line 3177).
- **POST /api/auth/create-test-accounts** – defined in `backend/server.js` (around line 2965).

Both use the `/api` prefix. Paths match the frontend and proxy.

---

## Step 3 – Route map and health

- On startup, the backend prints all registered routes and a short list of **/api/auth/\*** and **/api/health** for verification.
- **GET /api/health** returns:
  - `{ "ok": true, "db": true|false, "status": "TOMO Market Backend Running ✅" }`
  - `db: true` when PostgreSQL is connected, `db: false` when in simulation mode.

---

## Step 4 – curl commands and error codes

**Restart the backend first** (so it uses the latest code):

```bash
cd backend
node server.js
```

Then in another terminal:

```bash
# Health
curl -i http://localhost:3000/api/health

# Login (driver@tomo.com / driver123)
curl -i -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"driver@tomo.com\",\"password\":\"driver123\"}"
```

**Windows PowerShell:**

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/health" -Method GET
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"driver@tomo.com","password":"driver123"}' -UseBasicParsing
```

**Backend behaviour:**

- **DB down:** Login with `driver@tomo.com` / `driver123` → **200** and simulation driver (token + redirect to `/driver`). Any other credentials → **503** with `{ "code": "DB_UNAVAILABLE", "message": "..." }`.
- **DB up, user not found or wrong password:** **401** with `{ "code": "INVALID_CREDENTIALS", "message": "بيانات الدخول غير صحيحة" }`.
- **DB error during login (e.g. connection lost):** **503** with `{ "code": "DB_UNAVAILABLE", "message": "..." }` (or 200 for driver@tomo.com/driver123 in catch fallback).

---

## Step 5 – create-test-accounts (dev only, idempotent)

- **Guard:** Allowed when `ALLOW_TEST_ACCOUNTS=true` **or** `NODE_ENV !== 'production'`. Otherwise **403**.
- **DB down:** **503** with `code: "DB_UNAVAILABLE"`.
- **Idempotent:** If `driver@tomo.com` already exists (role driver), the endpoint updates password and driver record and returns success instead of error.

After calling create-test-accounts (with DB up), login with `driver@tomo.com` / `driver123` works against the real DB.

---

## Step 6 – Frontend error display

- **Readable error:** The API interceptor sets `error.userMessage` from `getUserFriendlyError(error)`, which uses backend `code` and `message` when present. Login/Create-test-account pages show `err.userMessage || err.response?.data?.message || fallback`.
- **Console:** Logs `API Error: [CODE] message` (e.g. `[DB_UNAVAILABLE] قاعدة البيانات غير متاحة...`) instead of a generic object.
- **HTML response:** If the response body looks like HTML (starts with `<`) or `Content-Type` is `text/html`, the user message is: *"Backend route not found / proxy misconfigured. Check Vite proxy and backend port."*

---

## Working credentials and verification

- **Driver (Rider):** `driver@tomo.com` / `driver123`
  - With **DB down:** simulation login works (no PostgreSQL needed).
  - With **DB up:** create test account once via "إنشاء Rider تجريبي" or `POST /api/auth/create-test-accounts`, then login works against DB.
- **Admin:** e.g. `admin@tomo.com` / `123456` (when DB is up and that user exists), or with DB down and `ALLOW_LOCAL_SEED_ADMIN=1`: `admin@local.test` or `admin@tomo.com` / `123456`.

**Final verification:**

1. Start backend: `cd backend && node server.js`
2. Start frontend: `cd frontend && npm run dev`
3. Open `http://localhost:5173/driver/login`
4. Log in with `driver@tomo.com` / `driver123`
5. You should be redirected to **/driver** (dashboard).

If you still see 500 or "حدث خطأ في تسجيل الدخول", restart the backend so it loads the latest code (simulation driver, 503/401, and catch fallback).
