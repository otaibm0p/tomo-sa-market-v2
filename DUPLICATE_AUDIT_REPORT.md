# TOMO Repo – Duplicate / Temp / Shadow Files Audit Report

**Date:** 2025-01-30  
**Summary:** **PASS** (with one syntax fix applied)

---

## A) Git status & working tree

### 1) Git status (porcelain)

```
 M backend/providers/whatsappProvider.js
 M backend/server.js
 M frontend/src/App.tsx
 M frontend/src/modules/admin/AdminSidebar.tsx
 M frontend/src/modules/admin/ControlCenter.tsx
 M frontend/src/modules/admin/MarketingCampaigns.tsx
 M frontend/src/shared/admin/adminPermissions.ts
?? backend/migrations/0009_whatsapp_message_log_index.sql
?? frontend/src/modules/admin/MarketingTemplates.tsx
?? tools/dev/
```

### 2) Git diff --stat

- 7 files changed, 579 insertions(+), 53 deletions(-) (backend WhatsApp/provider, frontend admin/marketing).
- No uncommitted changes that look like duplicate/copy files (no "نسخة", "copy", or backup-named source files).

### 3) Untracked files

| Path | Notes |
|------|--------|
| `backend/migrations/0009_whatsapp_message_log_index.sql` | New migration – keep, commit when ready |
| `frontend/src/modules/admin/MarketingTemplates.tsx` | New feature – keep, commit when ready |
| `tools/dev/` | Dev/test scripts – keep or add to repo as needed |

**Audit A:** No duplicate-looking uncommitted changes. **PASS**

---

## B) Duplicates by NAME patterns

Searched (case-insensitive): `*نسخة*`, `*copy*`, `*duplicate*`, `*backup*`, `*old*`, `*tmp*`, `*.bak`, `*~`, `*.log`, and folders `node_modules`, `dist`, `build`, `.vite`, `.cache`.

### Source tree (excluding node_modules, dist, build)

| Path | Size | Last modified | Recommendation |
|------|------|----------------|-----------------|
| `frontend/dist/assets/copy-OA_EXjje.js` | (chunk) | Build output | **Ignore** – Vite chunk name; `dist/` in .gitignore |
| (No other source files matched) | — | — | — |

- **node_modules / tomo-driver/node_modules:** Many matches (e.g. lucide-react `copy`, `backup`, babel/tailwind “duplicate” libs). All are dependency files – **Ignore**.
- **Editor backup:** One match in dependencies: `nested-error-stacks/README.md~` – already covered by `.gitignore` (`*~`).

**No duplicate or temp source files by name in repo.** **PASS**

---

## C) Duplicates by CONTENT (SHA256)

- **Scope:** `backend/`, `frontend/src/`, `tomo-driver/src/` (recursive).
- **Excluded:** `node_modules`, `dist`, `build`, `.git`, `archive`, `.vite`, `.cache`.
- **Result:** No two source files shared the same SHA256 hash.

**Duplicates by hash:** None. **PASS**

---

## D) Shadow imports / multiple entry points

### 1) Imports containing "نسخة", "copy", or duplicate API clients

- **"نسخة" in import paths:** None.
- **API client:** Single API module used everywhere: `frontend/src/utils/api.ts`. No `apiClient.ts` or `client.ts` in frontend (only reference is a comment in `useInventorySync.ts` pointing to `api.ts`).
- **App / Admin:** One `App.tsx` (`frontend/src/App.tsx`). One `AdminLayout.tsx` (modules/admin). Two files named `AdminSidebar`:  
  - `frontend/src/modules/admin/AdminSidebar.tsx` – wrapper that uses shared UI.  
  - `frontend/src/shared/admin/ui/components/AdminSidebar.tsx` – shared UI component.  
  This is intentional (module vs shared component), not a duplicate.

### 2) Ripgrep imports from removed/duplicate paths

- No imports from paths containing "نسخة", "copy", or other duplicate-style names.

**Suspicious imports:** None. **PASS**

---

## E) Single sources of truth

| Item | Status |
|------|--------|
| **API client** | Single source: `frontend/src/utils/api.ts`. All imports use `../utils/api` or `../../utils/api`. |
| **Auth** | Single handler: `backend/server.js` (all `/api/auth/*` and auth logic in this file; no separate auth controller). |
| **Vite** | One `frontend/vite.config.js`; dev server and production build in same config; no duplicate Vite configs. |
| **Backend entry** | One entry: `backend/package.json` → `"main": "server.js"`, `"start": "node server.js"`. `backend/src/server.ts` exists but is not the process entry. |

**Single sources:** Confirmed. **PASS**

---

## F) Build and typecheck

| Check | Result |
|-------|--------|
| **Frontend:** `npm run build` | ✓ Built successfully (Vite, 2549 modules). |
| **Frontend:** `tsc` / typecheck | No separate script; Vite build uses TypeScript – build succeeded. |
| **Backend:** `node -c server.js` | ✓ Passed after fixing duplicate `whatsapp` declaration (see below). |

**Build/typecheck:** **PASS**

---

## G) Safe actions taken

1. **Backend `server.js` (syntax):** In `PUT /api/settings`, `whatsapp` was destructured twice from `req.body` (once as shop string, once as config object), causing `SyntaxError: Identifier 'whatsapp' has already been declared`.  
   - **Fix:** Second occurrence aliased as `whatsappConfig` in the destructuring; all usages of the config object (e.g. around line 7165) updated to `whatsappConfig`.  
   - **Verification:** `node -c server.js` succeeds.

2. **`.gitignore`:** Added `.vite/` under “Temporary files” so Vite cache is not tracked.

No files were deleted. No business logic refactored.

---

## H) Actions recommended before server deploy

1. **Commit current changes** (if desired):  
   - Backend: `server.js` (whatsappConfig fix), `whatsappProvider.js`, `0009_whatsapp_message_log_index.sql`.  
   - Frontend: `App.tsx`, `AdminSidebar.tsx`, `ControlCenter.tsx`, `MarketingCampaigns.tsx`, `adminPermissions.ts`, `MarketingTemplates.tsx`.  
   - Root: `.gitignore` (`.vite/`).

2. **Optional:** Add `tools/dev/` to the repo or document it as local-only.

3. **No duplicate or shadow files** need to be removed; no further safe deletions recommended from this audit.

---

## Summary table

| Section | Result |
|--------|--------|
| A) Git status & working tree | PASS |
| B) Duplicates by name | PASS (none in source) |
| C) Duplicates by content (hash) | PASS (none) |
| D) Shadow imports | PASS (none) |
| E) Single sources of truth | PASS |
| F) Build + typecheck | PASS (after server.js fix) |
| Safe actions applied | server.js syntax fix; .gitignore .vite/ |

**Overall: PASS.** Repository is clean of duplicate/temp/shadow source files; one syntax bug was fixed and `.gitignore` updated.
