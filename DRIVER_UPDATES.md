## DRIVER_UPDATES

- **Driver workflow enforced (MVP)**:
  - Active deliveries only: `ASSIGNED`, `PICKED_UP`
  - History: `DELIVERED`
  - Removed “available orders” UI from the main driver dashboard.
- **Strict actions**:
  - `ASSIGNED` → `PICKED_UP` (confirm pickup)
  - `PICKED_UP` → `DELIVERED` (confirm delivered)
- **Maps**:
  - Google Maps deep link using coordinates if available, otherwise address query.
- **Shared statuses**:
  - Uses `frontend/src/shared/orderStatus.ts` for labels + normalization.
- **Legacy route safety**:
  - `/driver/tasks` now redirects to `/driver/dashboard`.
  - `/driver` now serves as the entry route (dashboard if authorized, otherwise login).

### Files
- `frontend/src/modules/delivery/DriverDashboard.tsx`
- `frontend/src/modules/delivery/DriverTasks.tsx`
- `frontend/src/modules/delivery/DriverLogin.tsx`
- `frontend/src/modules/delivery/DriverEntry.tsx`
- `frontend/src/shared/orderStatus.ts`
- `frontend/src/shared/toast.ts`

