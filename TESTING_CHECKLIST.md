# TOMO Market v2 - Testing Checklist

## ✅ Completed Implementations

### 1. Homepage Sections
- ✅ Fixed image sizing (1:1 aspect ratio) in Featured/Best Sellers/Deals sections
- ✅ Replaced "وصل حديثاً" with "عروض اليوم" everywhere
- ✅ Added automatic "View More" buttons to all homepage sections
- ✅ HomeProductCard component with professional layout

### 2. Products Page (/products)
- ✅ Full product listing with pagination (24 items per page)
- ✅ Filters: Category, Search, Price Range
- ✅ Sorting: Newest, Oldest, Price (Low/High), Name (A-Z/Z-A)
- ✅ URL parameters for shareable links
- ✅ Responsive design (mobile-first)

### 3. Product Detail Page
- ✅ Image gallery with thumbnails
- ✅ Zoom/lightbox functionality
- ✅ Tabs for: Description, Ingredients, Nutrition, Allergens, Storage
- ✅ Similar products section
- ✅ Brand and origin country display
- ✅ Mobile-friendly swipe navigation

### 4. Order Timer
- ✅ Real-time countdown timer
- ✅ SLA-based color coding (green/yellow/red)
- ✅ Order lifecycle tracking (paid_at → delivered_at)
- ✅ Admin-configurable thresholds

### 5. Backend API Enhancements
- ✅ `/api/products` now supports:
  - Pagination (page, limit)
  - Category filtering (category_id)
  - Search (search)
  - Price range (min_price, max_price)
  - Sorting (sort: newest, oldest, price_low, price_high, name_asc, name_desc)
  - Returns: `{ products, total, page, limit, totalPages, store }`

---

## 🧪 Testing Checklist

### A. Homepage Sections Behavior

#### Test 1: Image Display
- [ ] Open homepage
- [ ] Check Featured Products section
  - [ ] Images are square (1:1 ratio)
  - [ ] Images don't overflow or stretch
  - [ ] Images are consistent in size
- [ ] Check Best Sellers section
  - [ ] Same image behavior as Featured
- [ ] Check "عروض اليوم" (Deals of the Day) section
  - [ ] Same image behavior
  - [ ] Deal badges appear correctly
  - [ ] Countdown timer works (if deals have end_time)

#### Test 2: "View More" Buttons
- [ ] Each section has a "عرض المزيد" / "View More" button
- [ ] Clicking button navigates to `/products?section={section_key}`
- [ ] URL parameters are preserved

#### Test 3: Section Loading
- [ ] Sections load without errors
- [ ] Empty sections don't show (return null)
- [ ] Loading skeletons appear while fetching

---

### B. Product Page UX (Desktop & Mobile)

#### Test 4: Desktop Product Page
- [ ] Navigate to any product detail page
- [ ] Image Gallery:
  - [ ] Main image displays correctly
  - [ ] Click main image opens lightbox/zoom
  - [ ] Thumbnails appear below (if multiple images)
  - [ ] Click thumbnail changes main image
  - [ ] Lightbox supports keyboard navigation (Arrow keys, ESC)
- [ ] Product Information:
  - [ ] Product name is clear and readable
  - [ ] Brand displays (if available)
  - [ ] Price displays correctly
  - [ ] Discount price shows (if applicable)
  - [ ] Unit/weight information shows
- [ ] Tabs:
  - [ ] Description tab shows content
  - [ ] Ingredients tab (if available)
  - [ ] Nutrition tab (if available)
  - [ ] Allergens tab (if available)
  - [ ] Storage tab (if available)
  - [ ] Tabs only show if content exists
- [ ] Similar Products:
  - [ ] Shows 4-6 related products
  - [ ] Products are from same category
  - [ ] Clicking navigates to product page

#### Test 5: Mobile Product Page
- [ ] Open product page on mobile device
- [ ] Image Gallery:
  - [ ] Images are touch-friendly
  - [ ] Swipe between images works
  - [ ] Lightbox opens on tap
  - [ ] Lightbox closes on tap outside or swipe down
- [ ] Layout:
  - [ ] All content is readable
  - [ ] Tabs are scrollable horizontally
  - [ ] Add to cart button is accessible
  - [ ] Quantity selector works

---

### C. Products Page (/products) - Pagination & Filters

#### Test 6: Filters
- [ ] Navigate to `/products`
- [ ] Category Filter:
  - [ ] Dropdown shows all categories
  - [ ] Selecting category filters products
  - [ ] URL updates with `?category={id}`
- [ ] Search:
  - [ ] Type in search box
  - [ ] Results filter in real-time
  - [ ] URL updates with `?q={query}`
- [ ] Price Range:
  - [ ] Enter min price
  - [ ] Enter max price
  - [ ] Products filter correctly
  - [ ] URL updates with `?min_price={value}&max_price={value}`
- [ ] Clear Filters:
  - [ ] "Clear Filters" button appears when filters are active
  - [ ] Clicking clears all filters
  - [ ] URL resets

#### Test 7: Sorting
- [ ] Sort dropdown works
- [ ] Test each sort option:
  - [ ] Newest (default)
  - [ ] Oldest
  - [ ] Price: Low to High
  - [ ] Price: High to Low
  - [ ] Name: A-Z
  - [ ] Name: Z-A
- [ ] URL updates with `?sort={option}`
- [ ] Products reorder correctly

#### Test 8: Pagination
- [ ] If more than 24 products exist:
  - [ ] Pagination controls appear
  - [ ] Shows current page number
  - [ ] "Previous" button works
  - [ ] "Next" button works
  - [ ] Page numbers are clickable
  - [ ] URL updates with `?page={number}`
- [ ] Test edge cases:
  - [ ] First page (Previous disabled)
  - [ ] Last page (Next disabled)
  - [ ] Direct URL access with `?page=2` works

#### Test 9: URL Parameters
- [ ] Share URL with filters: `/products?category=1&sort=price_low&page=2`
- [ ] Page loads with correct filters applied
- [ ] All parameters work together

---

### D. Order Timer Behavior

#### Test 10: Order Timer Display
- [ ] Navigate to `/orders` (customer orders page)
- [ ] For active orders:
  - [ ] Timer displays with countdown
  - [ ] Timer color is green initially
  - [ ] Timer updates every second
- [ ] For completed orders:
  - [ ] Timer shows "Delivered" or completion message
  - [ ] No countdown

#### Test 11: Timer Colors (SLA)
- [ ] Check timer color logic:
  - [ ] Green: Time remaining > yellow threshold
  - [ ] Yellow: Time remaining between yellow and red thresholds
  - [ ] Red: Time remaining < red threshold or exceeded
- [ ] Colors match admin SLA settings

#### Test 12: Timer Accuracy
- [ ] Timer starts from `paid_at` timestamp
- [ ] Timer stops at `delivered_at` timestamp
- [ ] Elapsed time displays correctly
- [ ] Time remaining calculates correctly

---

### E. Existing Functionality (Regression Tests)

#### Test 13: Homepage
- [ ] Homepage loads without errors
- [ ] All existing sections work
- [ ] Cart functionality works
- [ ] Search bar works
- [ ] Navigation works

#### Test 14: Cart & Checkout
- [ ] Add products to cart
- [ ] Cart drawer opens/closes
- [ ] Quantity updates work
- [ ] Checkout process works
- [ ] Shipping cost is hidden (if admin setting enabled)

#### Test 15: Admin Panel
- [ ] Admin login works
- [ ] All admin pages load
- [ ] Product management works
- [ ] Order management works
- [ ] Settings pages work

---

## 🐛 Known Issues / Notes

1. **Backward Compatibility**: The `/api/products` endpoint now returns an object with `{ products, total, page, limit, totalPages }` instead of just an array. The frontend handles both formats.

2. **Store Filtering**: The geofencing logic still works, but pagination/filters are applied after store filtering.

3. **Performance**: For large product catalogs, ensure database indexes exist on:
   - `products.category_id`
   - `products.price`
   - `products.name`
   - `products.created_at`

---

## 📝 Testing Results Template

```
Date: ___________
Tester: ___________

Homepage Sections: [ ] Pass [ ] Fail - Notes: ___________
Product Page Desktop: [ ] Pass [ ] Fail - Notes: ___________
Product Page Mobile: [ ] Pass [ ] Fail - Notes: ___________
Products Page Filters: [ ] Pass [ ] Fail - Notes: ___________
Products Page Pagination: [ ] Pass [ ] Fail - Notes: ___________
Order Timer: [ ] Pass [ ] Fail - Notes: ___________
Regression Tests: [ ] Pass [ ] Fail - Notes: ___________

Overall Status: [ ] Ready for Production [ ] Needs Fixes

Issues Found:
1. ___________
2. ___________
3. ___________
```

---

## 🚀 Next Steps (After Testing)

Once testing is confirmed:
1. Smart pricing system completion
2. Admin pricing controls UI
3. Portal separation refinement
4. UX/UI polish

