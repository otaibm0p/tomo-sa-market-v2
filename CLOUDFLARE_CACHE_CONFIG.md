# Cloudflare Caching Configuration

## Navigation Path
Cloudflare Dashboard → Rules → Cache Rules

## Cache Rules

### Rule 1: Cache Static Assets
**Create Cache Rule:**
```
Rule name: Cache Static Assets
URL pattern: *tomo-sa.com/*.js OR *tomo-sa.com/*.css OR *tomo-sa.com/*.png OR *tomo-sa.com/*.jpg OR *tomo-sa.com/*.jpeg OR *tomo-sa.com/*.svg OR *tomo-sa.com/*.webp OR *tomo-sa.com/*.woff OR *tomo-sa.com/*.woff2

Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: Respect Existing Headers
```

**Note:** You may need to create separate rules for each file type, or use Page Rules (see below).

### Rule 2: Bypass API Cache
**Create Cache Rule:**
```
Rule name: Bypass API
URL pattern: *tomo-sa.com/api/*

Settings:
  - Cache Level: Bypass
```

### Rule 3: Bypass Socket.IO Cache
**Create Cache Rule:**
```
Rule name: Bypass Socket.IO
URL pattern: *tomo-sa.com/socket.io/*

Settings:
  - Cache Level: Bypass
```

---

## Alternative: Page Rules (If Cache Rules Not Available)

### Page Rule 1: API Bypass
**Path:** Rules → Page Rules

```
URL: https://tomo-sa.com/api/*
Settings:
  - Cache Level: Bypass
  - Disable Security: OFF
```

### Page Rule 2: Uploads Cache
```
URL: https://tomo-sa.com/uploads/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

### Page Rule 3: Static Assets Cache
```
URL: https://tomo-sa.com/*.js OR https://tomo-sa.com/*.css OR https://tomo-sa.com/*.png OR https://tomo-sa.com/*.jpg OR https://tomo-sa.com/*.svg OR https://tomo-sa.com/*.woff OR https://tomo-sa.com/*.woff2
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

---

## Cache Headers from Origin

Ensure your Nginx sends proper cache headers:
- Static files: `Cache-Control: public, max-age=31536000, immutable`
- API responses: `Cache-Control: no-cache, no-store, must-revalidate`
- Uploads: `Cache-Control: public, max-age=2592000`
