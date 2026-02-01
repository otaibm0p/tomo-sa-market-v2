# Repository Hygiene Audit — Pre-Production Checklist

**Date:** 2025-01-30  
**Objective:** Ensure NO duplicated files, NO temporary/dev-only leftovers, NO conflicting configs. Repo must be clean, deterministic, and production-safe.

---

## Step 1 — Duplicated or Shadowed Files

### ✔ Legit duplicates (intentional patterns)

| Item | Location | Notes |
|------|----------|--------|
| **AdminSidebar** | `frontend/src/modules/admin/AdminSidebar.tsx` vs `frontend/src/shared/admin/ui/components/AdminSidebar.tsx` | Module wraps shared UI component; both used. |
| **Barrel** | `frontend/src/hooks/index.ts` | Re-exports hooks; single barrel. |
| **Migrations** | `backend/migrations/0006_*`, `0007_*` (`.sql` and `_mysql.sql`) | Two DB variants (Postgres vs MySQL); run only the set matching your DB. |

### ✖ Unwanted duplicates (must be removed or merged)

| Path | Recommendation |
|------|----------------|
| `‏‏IMPLEMENTATION_SUMMARY - نسخة.md` | **REMOVE** — old copy of IMPLEMENTATION_SUMMARY.md |
| `frontend/src/modules/admin/‏‏Dashboard - نسخة.tsx` | **REMOVE** — duplicate Dashboard |
| `frontend/src/modules/admin/‏‏AdminSidebar - نسخة.tsx` | **REMOVE** — duplicate AdminSidebar |
| `frontend/src/modules/admin/‏‏AdminLayout - نسخة.tsx` | **REMOVE** — duplicate AdminLayout |
| `frontend/src/utils/‏‏api - نسخة.ts` | **REMOVE** — duplicate API client (second axios.create) |
| `frontend/src/‏‏App - نسخة.tsx` | **REMOVE** — duplicate App entry |
| `frontend/src/context/‏‏ThemeContext - نسخة.tsx` | **REMOVE** — duplicate ThemeContext |
| `frontend/src/context/‏‏LanguageContext - نسخة.tsx` | **REMOVE** — duplicate LanguageContext |

**Scan results:**
- No `*.old`, `*.bak`, `*-copy`, or `*-v2` filename patterns found.
- **API client:** Single canonical client in `frontend/src/utils/api.ts`; duplicate in `api - نسخة.ts` (unwanted).
- **Auth:** Single auth flow in `backend/server.js` (login/register/jwt); no duplicate controllers or auth handlers.
- **Config:** One Vite config; backend entry is `server.js` only (no `app.js`).

---

## Step 2 — Temporary / Dev-Only Files

| File / Pattern | Recommendation | Notes |
|----------------|----------------|--------|
| `*.log` | **IGNORE** | In `.gitignore`. |
| `archive/security.log` | **REMOVE** (if cleaning archive) or **IGNORE** | Not in active code path. |
| `*.tmp` / `*.temp` | **IGNORE** | In `.gitignore`. |
| `*.local.*` / `*.test.*` | **N/A** | None found. |
| `dev-server.mjs` | **N/A** | Not present. |
| `WINDOWS_DEV_FIX.md` | **N/A** | Not present. |
| `run-local.bat` | **N/A** | Not present. |
| `backend/test-order-lifecycle.js`, `test-api-response.js` | **KEEP** | Dev/test scripts; not used in prod start. |
| `backend/check-*.js`, `add-*.js`, `run-drivers-fix*.js`, `migrate.js`, etc. | **KEEP** | Ops/migration scripts; not prod entry. |
| **POST /api/auth/create-test-accounts** | **KEEP** | **Guarded:** `NODE_ENV !== 'production'` or `ALLOW_TEST_ACCOUNTS=true`; returns 403 in production. |

---

## Step 3 — Environment & Config Sanity

### Production entry paths

| Layer | Entry | Status |
|-------|--------|--------|
| Backend | `backend/server.js` (`package.json` `main` + `"start": "node server.js"`) | ✔ Single entry. |
| Frontend | `vite build` → `frontend/dist/` | ✔ Single build path. |

### Config duplication

- **Vite:** One config only: `frontend/vite.config.js`. ✔  
- **Proxy:** `proxy['/api']` → `http://localhost:3000` only in `server` block (dev); not used in production build. ✔  

### Hardcoded localhost / production safety

| Location | Issue | Severity |
|----------|--------|----------|
| **backend/server.js** (≈610) | `connectionString = "postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db"` — `DATABASE_URL` logic commented out | **BLOCKING** — Production must use `DATABASE_URL` from env. |
| **backend/public/login.html** (≈127) | `API_BASE = 'http://localhost:3000'` | **BLOCKING** if this page is used in production; must be configurable. |
| **frontend/src/utils/api.ts** (≈25) | Fallback `'http://localhost:5000'` when `VITE_API_URL` unset and not DEV | **BLOCKING** unless `VITE_API_URL` is always set in prod build. |
| **frontend/src/hooks/useInventorySync.ts** (≈21) | Fallback `'http://localhost:3000'` | **BLOCKING** unless `VITE_API_URL` set in prod. |
| **frontend/src/modules/admin/ZoneManagement.tsx** (≈241–242) | Error message hardcodes `http://localhost:3000` | Cosmetic; fix for clarity. |
| **frontend/src/modules/admin/StaffManagement.tsx** (≈290–291) | Error message hardcodes `http://localhost:5000` | Cosmetic; fix for clarity. |

### .env usage

| Item | Status |
|------|--------|
| `.env.example` at repo root | **Missing** — add or document required vars. |
| `backend/env.template` | Present; documents DB and env. |
| `.env`, `.env.local`, `.env.development` | In `.gitignore` — not committed. ✔ |
| Secrets in repo | `.env` ignored; **backend/server.js** contains hardcoded DB credentials — **must** switch to env. |

---

## Step 4 — Dead Code & Unused Routes

| Item | Type | Recommendation |
|------|------|----------------|
| **DriverTasks** | Component imported in `App.tsx` but no route uses it; `/driver` routes use `DriverDashboard` | **REMOVE** (unused import + component). |
| **DriverEntry** | Component imported in `App.tsx` but no route uses it; `/driver` uses `DriverLayout` | **REMOVE** (unused import + component) or **DEFER** if planned. |
| Placeholder modules (CatalogImportPlaceholder, ExperienceSupportPlaceholder, OpsSLAPlaceholder) | Reachable via admin routes | **KEEP** (planned). |
| All other lazy-loaded components in `App.tsx` | Used in routes | **KEEP**. |

---

## Step 5 — FINAL Pre-Production Checklist

### 1) Files safe to delete NOW (with paths)

- `‏‏IMPLEMENTATION_SUMMARY - نسخة.md`
- `frontend/src/modules/admin/‏‏Dashboard - نسخة.tsx`
- `frontend/src/modules/admin/‏‏AdminSidebar - نسخة.tsx`
- `frontend/src/modules/admin/‏‏AdminLayout - نسخة.tsx`
- `frontend/src/utils/‏‏api - نسخة.ts`
- `frontend/src/‏‏App - نسخة.tsx`
- `frontend/src/context/‏‏ThemeContext - نسخة.tsx`
- `frontend/src/context/‏‏LanguageContext - نسخة.tsx`
- `archive/security.log` (optional; only if trimming archive)

### 2) Files dev-only but safe to keep (not used in prod)

- All `backend/test-*.js`, `check-*.js`, `add-*.js`, `run-drivers-fix*.js`, `migrate.js`, `setup-dammam.js`, `scrape-carrefour.js`, etc.
- `frontend/vite.config.js` dev `server.proxy` block
- `backend/env.template`
- POST `/api/auth/create-test-accounts` (guarded in production)

### 3) Files / changes that MUST be removed or guarded before server deploy

1. **Backend DB connection**  
   In `backend/server.js`, use `process.env.DATABASE_URL` for the Postgres connection. Remove or replace the hardcoded `postgresql://tomo_admin:StrongPass123@localhost:5432/tomo_db`. Ensure production sets `DATABASE_URL`.

2. **Backend login.html**  
   If `backend/public/login.html` is served in production, make `API_BASE` configurable (e.g. from env or a small inline config), not fixed `http://localhost:3000`.

3. **Frontend API base**  
   - Set `VITE_API_URL` in the environment used for `vite build` so production build does not fall back to localhost.  
   - Align `useInventorySync.ts` with `api.ts` (same env var / resolution) so one source of truth.

4. **Optional cleanup**  
   - Remove unused `DriverTasks` and `DriverEntry` imports and components (or wire routes if planned).  
   - Replace hardcoded localhost in admin error messages (ZoneManagement, StaffManagement) with a generic message or configurable base URL.

### 4) Confirmation

**Blocking issues found.** Repo is **not** safe for production transfer until:

1. Backend uses **env-based `DATABASE_URL`** (no hardcoded DB URL in `server.js`).  
2. Production frontend build is done with **`VITE_API_URL`** set to the real API base (no localhost fallback in prod).  
3. If `backend/public/login.html` is used in prod, **API_BASE** is configurable and not localhost.

After the above are done and re-verified, you can confirm: **“Repo is clean and safe for production transfer.”**

---

*Audit performed without changing business logic or refactoring except where required to remove duplication. Production safety > convenience.*
