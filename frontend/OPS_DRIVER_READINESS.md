# Ops Driver & Riders Readiness – Manual Test Checklist

## Test Driver Account (if login fails)

- **Credentials**: `driver@tomo.com` / `driver123`
- **Create account**: On the driver login page (`/driver/login`), click **"إنشاء Rider تجريبي (driver@tomo.com)"** / **"Create test rider (driver@tomo.com)"**. This calls `POST /api/auth/create-test-accounts` and fills the form. Then click **Sign In**.
- **Backend required**: Backend must be running and DB connected. If the button fails, start the backend and ensure PostgreSQL is available.

## Driver Web (`/driver`)

- [ ] **Access**: Open `http://localhost:5173/driver` (after login as driver). Redirects to `/driver/login` if not authenticated.
- [ ] **KPIs**: Top row shows chips: Active Tasks, Offers, Late SLA, Status (Online/Offline). Values update when data changes.
- [ ] **Connection**: Badge shows "Connected" (green) or "Realtime unavailable" (amber) based on socket. Offline banner with "Refresh now" appears when disconnected.
- [ ] **Shift toggle**: Online/Offline toggle is visible and clickable (UI only; backend can be TODO).
- [ ] **Tabs**: "My Tasks" and "Map" tabs switch content. URL updates to `/driver` and `/driver/map` when switching.
- [ ] **Tasks tab**: Sub-tabs Offers (if OFFER_ACCEPT mode), Active, History. Active orders show SLA block (if feature enabled), status colors, and actions (View details, Maps, Copy address, Call).
- [ ] **Map tab**: Leaflet map shows pickup/dropoff markers for active orders when coordinates exist. Center falls back to Riyadh if no points.
- [ ] **Drawer**: Clicking an active order opens DriverDetailsDrawer with timeline, SLA, copy/open maps, a11y (keyboard close).

## Admin Riders Console (`/admin/riders`)

- [ ] **Access**: Open `http://localhost:5173/admin/riders` (after admin login).
- [ ] **Loading**: Skeleton (pulse) appears while riders load. No blank screen.
- [ ] **Error**: On API failure, error banner with "Retry" and "Copy error" appears. Retry reloads data.
- [ ] **Table**: Riders list with columns: Rider (name, email), Status (badge with success/warn/danger), Last seen, Last location, Active orders, Actions (View).
- [ ] **Filters**: Search by name/phone/ID and Status dropdown (Online, Offline, Busy, Available) filter the table.
- [ ] **View**: "View" opens RiderDetailsDrawer with rider profile, active order (if any), Copy ID, Ping, Assign order.
- [ ] **Assign order**: "Assign order" opens AssignOrderModal listing unassigned orders. Assign button (or graceful message if no orders/endpoint missing). Modal closes on success.

## i18n & RTL

- [ ] **Arabic**: Switch locale to Arabic. Driver and Riders pages show Arabic labels; layout is RTL where applicable.
- [ ] **English**: Switch to English; labels and direction (LTR) are correct.

## Build

- [ ] **Build**: Run `npm run build` in `frontend/`. Build completes without errors.
