# TOMO iOS App - QA Checklist

## Pre-Release Testing Checklist

### ✅ Authentication
- [ ] OTP flow works (mock)
- [ ] Email login works (mock)
- [ ] Apple Sign In works (mock)
- [ ] Google Sign In works (mock)
- [ ] Language switching works during auth

### ✅ Home Screen
- [ ] Home renders without crashes
- [ ] Premium header displays correctly
- [ ] Search bar is functional
- [ ] Categories grid displays
- [ ] Featured products carousel works
- [ ] Skeleton loading shows when data is empty
- [ ] Cart badge is visible and readable
- [ ] Navigation to categories works
- [ ] Navigation to product details works

### ✅ Search
- [ ] Search input works
- [ ] Search results display correctly
- [ ] Empty state shows when no results
- [ ] Product cards in search are tappable
- [ ] Navigation to product details from search works

### ✅ Product Details
- [ ] Product images carousel works (multi-image)
- [ ] Single image fallback works
- [ ] Product name and description display correctly
- [ ] Price displays correctly
- [ ] "Add to Cart" button works (adds 1 item)
- [ ] Quantity stepper appears after adding
- [ ] "View Cart" button navigates to cart tab
- [ ] Cart badge in toolbar is visible
- [ ] Back navigation works smoothly (no white flash)

### ✅ Cart
- [ ] Cart displays items correctly
- [ ] Cart totals are correct
- [ ] Quantity controls work (+/-)
- [ ] Remove item works
- [ ] Empty cart state displays
- [ ] "Continue Shopping" navigates to home
- [ ] "Checkout" button opens checkout screen
- [ ] Cart badge updates correctly

### ✅ Checkout
- [ ] Checkout screen opens
- [ ] Order summary displays correctly
- [ ] Payment methods display (mock)
- [ ] Address selection works
- [ ] Order creation works (mock)
- [ ] Success screen displays after order

### ✅ Orders
- [ ] Orders list displays without crashes
- [ ] Empty orders state displays
- [ ] Order cards are tappable
- [ ] Order details screen opens
- [ ] Order timeline displays correctly
- [ ] Order status is readable (Arabic/English)
- [ ] Order totals are correct
- [ ] No fatal crashes on decode errors

### ✅ Profile
- [ ] Profile screen displays
- [ ] Language switching works
- [ ] Settings navigation works
- [ ] Addresses navigation works
- [ ] Payment methods navigation works
- [ ] Support navigation works
- [ ] Logout works

### ✅ Navigation
- [ ] Tab switching works smoothly
- [ ] No white flashes during navigation
- [ ] Back button works correctly
- [ ] Deep linking works (if implemented)
- [ ] Router resets correctly on tab change

### ✅ Localization
- [ ] Arabic text displays correctly
- [ ] English text displays correctly
- [ ] RTL layout works for Arabic
- [ ] LTR layout works for English
- [ ] All UI elements respect language setting

### ✅ Performance
- [ ] App launches quickly
- [ ] No memory leaks
- [ ] Smooth scrolling
- [ ] Images load correctly
- [ ] No excessive CPU usage

### ✅ Build & Archive
- [ ] App builds without errors
- [ ] No duplicate file warnings
- [ ] Release configuration works
- [ ] Archive succeeds
- [ ] App runs on simulator
- [ ] App runs on device

## Known Issues / Notes
- Mock data is used for all features
- Payment processing is mocked
- Real-time tracking is mocked

## Test Devices
- [ ] iPhone 15 Pro (iOS 17+)
- [ ] iPhone SE (iOS 17+)
- [ ] iPad (if supported)

## Sign-off
- [ ] QA Lead: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______
