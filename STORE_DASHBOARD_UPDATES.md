## STORE_DASHBOARD_UPDATES

- **Store workflow (MVP)** with filters:
  - **New**: `CREATED`
  - **To prepare**: `ACCEPTED`, `PREPARING`
  - **Ready**: `READY`
  - **In delivery**: `ASSIGNED`, `PICKED_UP`
  - **Completed**: `DELIVERED`
  - **Cancelled**: `CANCELLED`
- **Strict actions**:
  - `CREATED` → `ACCEPTED` (Accept)
  - `ACCEPTED` → `PREPARING`
  - `PREPARING` → `READY`
  - Cancel any non-final order (confirm dialog)
- **Order details**:
  - Shows items (if included), quantities, totals, address, phone, notes.
- **Shared statuses**:
  - Arabic labels and normalization via `frontend/src/shared/orderStatus.ts`.
- **Production UX**:
  - Toasts for API errors and success states.
  - Empty states and expandable order details.
- **Route behavior**:
  - `/store` is now the entry route (dashboard if authorized, otherwise login).

### Files
- `frontend/src/modules/store/StoreDashboard.tsx`
- `frontend/src/modules/store/StoreEntry.tsx`
- `frontend/src/shared/orderStatus.ts`
- `frontend/src/shared/toast.ts`

