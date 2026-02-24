# TOMO iOS — Pre-Launch QA Checklist

## Test Scenarios

### 1. Authentication Flow
- [ ] Launch app → Should show Auth screen
- [ ] Test Phone OTP login (mock code: 123456)
- [ ] Test Email login
- [ ] Verify user session persists after app restart
- [ ] Test logout → Should return to Auth screen

### 2. Browse & Search
- [ ] Home tab displays categories and featured products
- [ ] Tap category → Opens category products
- [ ] Tap product → Opens product details
- [ ] Search tab → Type search query → Results appear
- [ ] Search empty state shows correctly
- [ ] RTL layout works in Arabic mode

### 3. Product Details
- [ ] Product images display (or placeholder)
- [ ] Quantity controls work (+/-)
- [ ] "Add to Cart" button adds product
- [ ] Toast confirmation appears after add
- [ ] Cart bottom bar updates with new item count

### 4. Cart Flow
- [ ] Cart tab shows items correctly
- [ ] Increase/decrease quantity works
- [ ] Remove item works
- [ ] Cart total calculates correctly
- [ ] "Continue Shopping" button navigates to Home
- [ ] "Checkout" button navigates to Checkout screen
- [ ] Empty cart state displays correctly

### 5. Checkout (Placeholder)
- [ ] Address selection placeholder works
- [ ] Delivery slot selection works
- [ ] Payment method selection works
- [ ] Summary shows correct totals
- [ ] "Confirm Order" creates order and clears cart
- [ ] Success screen appears
- [ ] "View Orders" navigates to Orders tab
- [ ] "Continue Shopping" navigates to Home

### 6. Orders Timeline
- [ ] Orders tab displays mock orders
- [ ] Tap order → Opens order details
- [ ] Timeline shows current status correctly
- [ ] Status labels are localized (AR/EN)
- [ ] Empty orders state displays correctly

### 7. Profile & Settings
- [ ] Profile displays user info
- [ ] Language switch works (AR ↔ EN)
- [ ] Language persists after app restart
- [ ] RTL layout switches correctly
- [ ] Addresses screen opens
- [ ] Payment methods screen opens
- [ ] Settings screen opens
- [ ] Support screen opens
- [ ] Logout works correctly

### 8. Navigation Stability
- [ ] Tab switching works smoothly
- [ ] Back button always works (no blank screens)
- [ ] NavigationStack doesn't cause crashes
- [ ] Deep navigation (Home → Category → Product) works
- [ ] Returning from deep navigation works

### 9. Language & RTL
- [ ] All text is localized
- [ ] RTL layout direction correct in Arabic
- [ ] Chevrons point correct direction
- [ ] Text alignment correct (RTL for AR, LTR for EN)
- [ ] Language persists across app restarts

### 10. Edge Cases
- [ ] App handles empty cart gracefully
- [ ] App handles empty orders gracefully
- [ ] App handles network errors (if applicable)
- [ ] No crashes on rapid tab switching
- [ ] No memory leaks on navigation

## Debug Panel (DEBUG builds only)
- [ ] Tap TOMO logo 5 times → Debug panel opens
- [ ] Clear Cart works
- [ ] Seed Mock Orders works
- [ ] Reset Auth works
- [ ] Language switch works

## Known Limitations (Pre-Launch)
- Checkout is placeholder (no real payment)
- Orders are mock data
- No real backend integration
- No push notifications
- No real-time tracking

## Build Requirements
- iOS 17.0+
- Xcode 15.0+
- No compiler errors
- No runtime crashes
- All tabs functional
