## ADMIN_UPDATES

- **MVP statuses only**: Admin Orders UI now uses only \(CREATED, ACCEPTED, PREPARING, READY, ASSIGNED, PICKED_UP, DELIVERED, CANCELLED\).
- **Shared module**: Centralized status labels + transitions in `frontend/src/shared/orderStatus.ts` and used in Admin UI.
- **Filters updated**: Status filter dropdown updated to MVP-only statuses.
- **Search**: Added search by **order id** and **customer phone** (if present in payload) and customer name.
- **Safe transitions**:
  - Quick status buttons show only **allowed** transitions.
  - Bulk actions skip invalid transitions and show a toast with applied/skipped counts.
- **Auto-dispatch alignment**:
  - Delayed alert and auto-assign target **READY** orders with no driver.
  - Auto-assign updates UI to **ASSIGNED**.

### Files
- `frontend/src/modules/admin/OrdersManagement.tsx`
- `frontend/src/shared/orderStatus.ts`
- `frontend/src/shared/toast.ts`

