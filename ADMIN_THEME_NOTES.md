# Admin Theme: Safe Dark Accents

## Overview

**Safe Dark Accents** is a reversible, UI-only theme for the Admin panel. It is **not** full dark mode: only the sticky status bar, sidebar, and table/section headers use darker backgrounds. Content surfaces (cards, forms, tables body) stay light for readability, especially for Arabic text.

## Before / After (notes)

- **Before (Light):** Sticky bar and sidebar are white/light gray; table headers are `bg-gray-50/80`.
- **After (Dark accents):**
  - **Sticky status bar** (Mission Control): Background `#1e293b` (slate-800), subtle border; status pills keep semantic colors (green/amber/rose).
  - **Sidebar:** Background `#1e293b`; nav text high-contrast (`#f1f5f9`); active item keeps green indicator `#047857`; section headers muted (`#94a3b8`).
  - **Table headers:** Row background `#334155` (slate-700), header text `#cbd5e1`.
  - **Cards / content:** Remain white; no change to avoid readability issues.

## Behavior

- **Toggle:** Control Center → "مظهر لوحة التحكم" / "Admin appearance" → "فاتح" | "داكن فاخر (آمن)".
- **Storage:** `localStorage` key `tomo_admin_theme` (`light` | `dark_accents`). Default `light`.
- **Application:** `data-admin-theme="light"|"dark_accents"` on `<html>`. Applied on admin layout mount and when user changes the toggle.
- **Primary green:** Unchanged `#047857` in both modes.
- **Accessibility:** No pure black; contrast kept for Arabic text; no animated flicker.

## Technical

- **Tokens:** `frontend/src/shared/admin/ui/tokens.ts` — `getAdminTheme()`, `applyAdminTheme(mode)`.
- **CSS:** `frontend/src/index.css` — `html[data-admin-theme="dark_accents"]` selectors for `.admin-mission-bar`, `.admin-shell-sidebar`, `.admin-table-head-row`.
- **No backend:** Theme is client-only; no API or server setting.
