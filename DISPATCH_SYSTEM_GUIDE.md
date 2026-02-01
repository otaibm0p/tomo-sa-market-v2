# Automated Order Dispatch System - Admin Guide

## Overview

The Automated Order Dispatch System automatically distributes new orders to couriers without human intervention. The system supports two modes: **AUTO_OFFER** and **AUTO_ASSIGN**, which can be switched at any time from the admin panel.

## Accessing Dispatch Settings

1. Navigate to **Admin Panel** → **Delivery** → **Dispatch Settings**
2. Configure all settings as needed
3. Click **Save Settings** to apply changes immediately

## Dispatch Modes

### AUTO_OFFER Mode

**Best for:** High courier availability, competitive environment

**How it works:**
1. When a new order is created, the system selects N eligible couriers (configurable)
2. Offers are sent to all selected couriers simultaneously via real-time notifications
3. The first courier to **ACCEPT** gets the order
4. All other offers are automatically cancelled

**Advantages:**
- Fast response time (first to accept wins)
- Fair competition among couriers
- Works well with many available couriers

**Configuration:**
- **Max Couriers per Offer**: Number of couriers to send offers to (1-20)
- **Offer Timeout**: How long couriers have to accept (10-300 seconds)

### AUTO_ASSIGN Mode

**Best for:** Optimized distribution, performance-based assignment

**How it works:**
1. When a new order is created, the system ranks all eligible couriers using a scoring algorithm
2. The order is automatically assigned to the **best courier** based on score
3. The courier has X seconds to accept
4. If rejected or timeout, the system assigns to the next best courier

**Scoring Factors (configurable weights):**
- **Distance Weight** (0.0 - 1.0): How important proximity to store is
- **Performance Weight** (0.0 - 1.0): How important courier performance score is
- **Fairness Weight** (0.0 - 1.0): How important fair distribution (time since last assignment) is

**Note:** Total weights should equal 1.0 for optimal results

**Advantages:**
- Optimized assignments based on multiple factors
- Fair distribution among couriers
- Better for performance tracking

## Settings Explained

### Enable/Disable Automation
- **ON**: System automatically dispatches all new orders
- **OFF**: Orders remain unassigned, require manual assignment

### Offer Timeout (seconds)
- Time couriers have to accept an offer
- Recommended: 30-60 seconds
- Range: 10-300 seconds

### Max Couriers per Offer (AUTO_OFFER only)
- Number of couriers to send offers to simultaneously
- Recommended: 3-5 couriers
- Range: 1-20 couriers

### Retry Settings
- **Retry Enabled**: Automatically retry if no courier accepts
- **Max Retries**: Maximum number of retry attempts (1-10)
- If all retries fail, fallback behavior is triggered

### Fallback Behavior
When all dispatch attempts fail:
- **Notify Admin**: Send notification to admin dashboard (default)
- **Switch to Manual**: Disable automation for this order, require manual assignment
- **Keep Retrying**: Continue retrying indefinitely (use with caution)

## Courier Eligibility

Couriers must meet ALL of these criteria to receive offers/assignments:
- ✅ **Online**: Last seen within 120 seconds
- ✅ **Available**: Status is "available" (not busy)
- ✅ **Active**: Account is active and approved
- ✅ **Not Banned**: Account is not banned
- ✅ **Not Assigned**: Currently not assigned to another order
- ✅ **Within Zone**: Within allowed delivery zone (if zones are configured)

## Real-Time Events

The system emits real-time Socket.IO events:

### For Couriers:
- `order_offer`: New offer received (AUTO_OFFER mode)
- `order_assigned`: Order assigned (AUTO_ASSIGN mode)
- `order_offer_cancelled`: Offer cancelled (another courier accepted)

### For Admin:
- `dispatch_event`: Dispatch events (offers_sent, order_assigned, order_accepted, order_rejected)
- `dispatch_failed`: Dispatch failed (no couriers available)
- `dispatch_settings_updated`: Settings were updated

## Monitoring Dispatch History

1. Navigate to **Orders** → Select an order
2. View **Dispatch History** tab to see:
   - All dispatch attempts
   - Which couriers were offered/assigned
   - Response status (ACCEPTED, REJECTED, TIMEOUT, CANCELLED)
   - Timestamps

## Best Practices

### When to Use AUTO_OFFER:
- Many couriers available (5+)
- Fast response time is critical
- Competitive environment preferred
- Peak hours with high order volume

### When to Use AUTO_ASSIGN:
- Fewer couriers available (<5)
- Performance optimization is important
- Fair distribution is critical
- Off-peak hours with lower order volume

### Recommended Settings:

**Peak Hours (High Volume):**
- Mode: AUTO_OFFER
- Max Couriers: 5-7
- Timeout: 30 seconds
- Retry: Enabled, 2-3 attempts

**Off-Peak Hours (Low Volume):**
- Mode: AUTO_ASSIGN
- Timeout: 45 seconds
- Retry: Enabled, 3-5 attempts
- Scoring: Balanced weights (0.33 each)

**Performance-Focused:**
- Mode: AUTO_ASSIGN
- Performance Weight: 0.5
- Distance Weight: 0.3
- Fairness Weight: 0.2

## Troubleshooting

### Orders Not Being Dispatched
1. Check if automation is **enabled**
2. Verify couriers are **online** and **available**
3. Check **dispatch history** for error messages
4. Review **fallback behavior** settings

### No Couriers Available
- System will retry based on settings
- Check courier status in **Riders** page
- Verify couriers are within delivery zones
- Consider adjusting timeout or retry settings

### Too Many Rejections
- Increase **offer timeout** to give couriers more time
- Review courier performance and consider training
- Check if delivery zones are too restrictive
- Consider switching to AUTO_ASSIGN mode

## API Endpoints

### Admin Endpoints:
- `GET /api/admin/dispatch/settings` - Get current settings
- `PUT /api/admin/dispatch/settings` - Update settings
- `GET /api/admin/orders/:orderId/dispatch-history` - Get dispatch history

### Courier Endpoints:
- `POST /api/drivers/orders/:orderId/accept` - Accept order (with attempt_id)
- `POST /api/drivers/orders/:orderId/reject` - Reject order (with attempt_id)

## Technical Notes

- All dispatch operations use database transactions to prevent race conditions
- Row-level locking prevents double assignment
- Settings changes take effect immediately (no restart required)
- System logs all dispatch decisions for audit trail
- Courier stats are automatically updated on assignment

## Support

For issues or questions:
1. Check dispatch history for the specific order
2. Review system logs for errors
3. Verify courier eligibility criteria
4. Contact system administrator if issues persist

