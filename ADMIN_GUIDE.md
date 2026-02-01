# TOMO Market v2 - Admin Control Guide

## Overview
This guide explains how to manage homepage sections, product images, and similar products from the admin panel.

## Admin Access
- Navigate to `/admin` in your browser
- Login with admin credentials
- Access the management screens from the sidebar

## 1. Homepage Sections Management

### Location
**Admin Panel → Homepage Sections** (or navigate to `/admin/homepage-sections`)

### Features
- **Enable/Disable Sections**: Toggle each section on/off
- **Section Types Available**:
  - `best_sellers` - Best selling products
  - `new_arrivals` - Newest products
  - `featured` - Featured products

### Configuration Options

#### Basic Settings
- **Title (Arabic/English)**: Display title for the section
- **Layout Type**: 
  - `slider` - Horizontal scrolling carousel (mobile-friendly)
  - `grid` - Grid layout (desktop-friendly)
- **Item Limit**: Number of products to show (1-50)
- **Sort Priority**: Order sections appear on homepage (lower = first)

#### Sorting Options
- **Popularity**: Based on order count (best sellers)
- **New Arrivals**: By creation date (newest first)
- **Featured**: Products marked as featured

#### Image Settings
- **Image Ratio**: 
  - `1:1` - Square images (recommended)
  - `4:5` - Portrait images
- **Hide Missing Images**: Hide products without images

#### CTA (Call-to-Action)
- **CTA Text (AR/EN)**: Button text
- **CTA Link**: Where button links to

### How to Use
1. Go to Admin Panel → Homepage Sections
2. Click on any section to expand
3. Modify settings (changes save automatically)
4. Toggle "Enabled" to show/hide section
5. Adjust "Sort Priority" to reorder sections

## 2. Product Images Management

### Location
**Admin Panel → Products → Edit Product → Images Tab**

### Features
- **Primary Image**: Main product image (shown in cards and detail page)
- **Gallery Images**: Additional images for product detail page
- **Image Reordering**: Drag to reorder images
- **Image Removal**: Delete unwanted images

### How to Use
1. Go to Admin Panel → Products
2. Find and click "Edit" on a product
3. Navigate to "Images" tab
4. **Add Primary Image**:
   - Enter image URL in "Primary Image URL" field
   - Or upload via file input (if configured)
5. **Add Gallery Images**:
   - Click "Add Image"
   - Enter image URL
   - Set as primary if needed
   - Drag to reorder
6. **Remove Image**: Click delete icon
7. Click "Save Images"

### Image Requirements
- **Format**: JPG, PNG, WebP
- **Size**: Recommended 800x800px or larger
- **URL**: Must be publicly accessible
- **Primary Image**: Required for product cards

## 3. Product Detail Page Features

### Image Gallery
- **Main Image**: Large display with zoom on click
- **Thumbnails**: Click to switch main image
- **Lightbox**: Full-screen zoom with navigation
  - Click main image to open
  - Use arrow keys to navigate
  - Mouse wheel + Ctrl to zoom
  - ESC to close

### Description Tabs
- **Description**: Full product description (AR/EN)
- **Details**: Barcode, unit, price per unit, brand
- **Shipping & Returns**: Policy information

### Similar Products
- **Automatic**: Shows products from same category
- **Configurable**: Admin can set strategy
- **Default**: 8 products, slider on mobile

## 4. Similar Products Configuration

### Location
**Admin Panel → Products → Edit Product → Similar Products**

### Strategy Options
1. **Category Only**: Same category_id
2. **Category + Brand**: Same category AND brand
3. **Manual Selection**: Admin chooses specific products

### How to Configure
1. Edit product
2. Go to "Similar Products" section
3. Choose strategy
4. If manual: Select products from list
5. Set number of products (default: 8)
6. Save

## 5. API Endpoints

### Public Endpoints
- `GET /api/homepage/sections` - Get enabled sections
- `GET /api/homepage/sections/:key/products` - Get products for section
- `GET /api/products/:id` - Get product with images
- `GET /api/products/:id/similar` - Get similar products

### Admin Endpoints (Requires Auth)
- `GET /api/admin/homepage/sections` - Get all sections
- `PUT /api/admin/homepage/sections/:id` - Update section
- `PUT /api/admin/products/:id/images` - Update product images

## 6. Database Tables

### `homepage_sections`
Stores homepage section configurations.

### `product_images`
Stores product image gallery:
- `product_id` - Foreign key to products
- `url` - Image URL
- `is_primary` - Primary image flag
- `sort_order` - Display order

### `app_settings`
Global settings (shipping/returns policies).

## 7. Troubleshooting

### Sections Not Showing
1. Check section is enabled
2. Verify products exist for section
3. Check sort_mode matches product data
4. Clear browser cache

### Images Not Loading
1. Verify image URLs are accessible
2. Check CORS settings if external URLs
3. Ensure primary image is set
4. Check product_images table has data

### Similar Products Empty
1. Verify category_id is set
2. Check other products exist in same category
3. Verify products have available_quantity > 0
4. Check strategy configuration

## 8. Best Practices

### Homepage Sections
- Keep item_limit between 8-12 for best UX
- Use slider for mobile-heavy traffic
- Use grid for desktop-focused sites
- Set appropriate sort_priority (0-10)

### Product Images
- Always set primary image
- Use consistent image sizes (800x800px recommended)
- Optimize images for web (compress)
- Use CDN for faster loading

### Similar Products
- Use category+brand for better relevance
- Limit to 8-12 products
- Ensure products are in stock

## Support
For issues or questions, check:
- Backend logs: `pm2 logs tomo-backend`
- Frontend console: Browser DevTools
- Database: Check tables directly

