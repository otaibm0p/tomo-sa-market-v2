# Cloudflare Production Setup - Complete Guide
## tomo-sa.com + All Subdomains

---

## 📋 PRE-SETUP VERIFICATION

### ✅ Origin Server Status
- **IP:** 138.68.245.29
- **SSL Certificate:** Valid (Let's Encrypt, expires: Apr 7, 2026)
- **Nginx:** Active and running
- **Backend API:** Operational (http://127.0.0.1:3000)
- **Frontend:** /var/www/tomo-app/frontend/dist (Exists)
- **Uploads:** /var/www/tomo-app/uploads (Exists)

**Status:** ✅ Server is ready for Cloudflare

---

## 1️⃣ DNS SETUP

### Step-by-Step Instructions

1. **Login to Cloudflare**
   - URL: https://dash.cloudflare.com
   - Select domain: `tomo-sa.com`

2. **Navigate to DNS**
   - Click: **DNS** → **Records**

3. **Delete existing records** (if any direct IP records exist for subdomains)

4. **Add A Record (Main Domain)**
   ```
   Click: Add record
   Type: A
   Name: tomo-sa.com (or @)
   IPv4 address: 138.68.245.29
   Proxy status: ☁️ Proxied (Orange cloud MUST be ON)
   TTL: Auto
   Save
   ```

5. **Add CNAME Records (All Subdomains)**

   **www:**
   ```
   Type: CNAME
   Name: www
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (ON)
   TTL: Auto
   ```

   **admin:**
   ```
   Type: CNAME
   Name: admin
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (ON)
   TTL: Auto
   ```

   **store:**
   ```
   Type: CNAME
   Name: store
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (ON)
   TTL: Auto
   ```

   **driver:**
   ```
   Type: CNAME
   Name: driver
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (ON)
   TTL: Auto
   ```

### ✅ DNS Verification
After adding records:
- All 5 records must show orange cloud (☁️)
- Wait 1-5 minutes for propagation
- Verify: `dig tomo-sa.com` should return Cloudflare IPs (104.x.x.x or 172.x.x.x)

---

## 2️⃣ SSL/TLS CONFIGURATION

### Navigation
**Cloudflare Dashboard** → **SSL/TLS** → **Overview**

### Critical Settings

#### SSL/TLS encryption mode
- **Select:** `Full (strict)` ⚠️ NOT Flexible
- **Why:** Validates origin certificate, most secure

#### Edge Certificates Tab
- **Always Use HTTPS:** ✅ Toggle ON
- **Automatic HTTPS Rewrites:** ✅ Toggle ON
- **Minimum TLS Version:** Select `TLS 1.2`
- **TLS 1.3:** ✅ Toggle ON
- **Opportunistic Encryption:** ✅ Toggle ON
- **Certificate Transparency Monitoring:** ✅ Toggle ON

#### Origin Server Tab
- **Minimum TLS Version:** `TLS 1.2`

### ⚠️ Important
- ❌ **NEVER use Flexible mode** - It's insecure and won't work with our setup
- ✅ **Full (strict) requires valid SSL on origin** - We have Let's Encrypt ✅
- ✅ **Origin certificate must be valid** - Currently valid until Apr 7, 2026 ✅

---

## 3️⃣ SECURITY CONFIGURATION

### A. Web Application Firewall (WAF)
**Path:** Security → WAF

**Settings:**
- **WAF:** ✅ Toggle ON
- **Security Level:** Medium
- **Challenge Passage:** 30 minutes

**Managed Rules:**
- ✅ **Cloudflare Managed Ruleset:** ON
- ✅ **OWASP Core Ruleset:** ON
- ✅ **Cloudflare Exposed Credentials Check:** ON

### B. Bot Management
**Path:** Security → Bots

**Settings:**
- **Bot Fight Mode:** ✅ Toggle ON
- **Super Bot Fight Mode:** (Optional - requires paid plan)

### C. Browser Integrity Check
**Path:** Security → Settings

**Settings:**
- **Browser Integrity Check:** ✅ Toggle ON

### D. DDoS Protection
**Path:** Security → DDoS

**Settings:**
- **HTTP DDoS attack protection:** ✅ ON (Automatic)
- **Network-layer DDoS attack protection:** ✅ ON (Automatic)

### E. Rate Limiting Rules
**Path:** Security → WAF → Rate limiting rules → Create rule

#### Rule 1: API Rate Limit
```
Rule name: API Rate Limit
Path: /api/*
Rate: 120 requests per 60 seconds
Action: Block for 10 minutes
Bypass: None
```

#### Rule 2: Socket.IO Rate Limit
```
Rule name: Socket.IO Rate Limit
Path: /socket.io/*
Rate: 300 requests per minute
Action: Challenge (CAPTCHA)
Bypass: None
```

---

## 4️⃣ CACHE RULES

### Option A: Cache Rules (Recommended - New Interface)
**Path:** Rules → Cache Rules → Create rule

#### Rule 1: Cache Static Assets
```
Rule name: Cache Static Assets
URL pattern: *tomo-sa.com/*.js OR *tomo-sa.com/*.css OR *tomo-sa.com/*.png OR *tomo-sa.com/*.jpg OR *tomo-sa.com/*.jpeg OR *tomo-sa.com/*.svg OR *tomo-sa.com/*.webp OR *tomo-sa.com/*.woff OR *tomo-sa.com/*.woff2

Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  - Browser Cache TTL: Respect Existing Headers
```

#### Rule 2: Bypass API
```
Rule name: Bypass API
URL pattern: *tomo-sa.com/api/*

Settings:
  - Cache Level: Bypass
```

#### Rule 3: Bypass Socket.IO
```
Rule name: Bypass Socket.IO
URL pattern: *tomo-sa.com/socket.io/*

Settings:
  - Cache Level: Bypass
```

#### Rule 4: Cache Uploads
```
Rule name: Cache Uploads
URL pattern: *tomo-sa.com/uploads/*

Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

### Option B: Page Rules (If Cache Rules Not Available)
**Path:** Rules → Page Rules → Create Page Rule

#### Rule 1: API Bypass
```
URL: https://tomo-sa.com/api/*
Settings:
  - Cache Level: Bypass
  Priority: 1
```

#### Rule 2: Socket.IO Bypass
```
URL: https://tomo-sa.com/socket.io/*
Settings:
  - Cache Level: Bypass
  Priority: 2
```

#### Rule 3: Uploads Cache
```
URL: https://tomo-sa.com/uploads/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  Priority: 3
```

#### Rule 4: Static Assets Cache
```
URL: https://tomo-sa.com/*.js OR https://tomo-sa.com/*.css OR https://tomo-sa.com/*.png OR https://tomo-sa.com/*.jpg OR https://tomo-sa.com/*.svg OR https://tomo-sa.com/*.woff OR https://tomo-sa.com/*.woff2
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
  Priority: 4
```

---

## 5️⃣ SPEED OPTIMIZATION

### Navigation
**Cloudflare Dashboard** → **Speed** → **Optimization**

### Settings

#### Compression
- **Brotli:** ✅ Toggle ON

#### Auto Minify
- **HTML:** ✅ Toggle ON
- **CSS:** ✅ Toggle ON
- **JavaScript:** ✅ Toggle ON

#### Network
- **HTTP/3 (with QUIC):** ✅ Toggle ON
- **0-RTT Connection Resumption:** ✅ Toggle ON (if available)
- **Early Hints:** ✅ Toggle ON

#### Optimization
- **Rocket Loader:** ✅ Toggle ON
- **Mirage:** (Optional - image optimization)
- **Polish:** (Optional - image compression)

---

## 6️⃣ VERIFICATION STEPS

After completing all configurations, run these checks:

### Check 1: DNS Resolution
```bash
dig tomo-sa.com A
# Should return Cloudflare IPs (104.x.x.x or 172.x.x.x)

dig www.tomo-sa.com CNAME
# Should return: www.tomo-sa.com. -> tomo-sa.com.
```

### Check 2: HTTPS Connection
```bash
curl -I https://tomo-sa.com
# Should see:
# - HTTP/2 200
# - server: cloudflare
# - strict-transport-security header
```

### Check 3: API Health
```bash
curl https://tomo-sa.com/api/health
# Should return: {"ok":true,"status":"healthy","ts":"..."}
```

### Check 4: Security Headers
```bash
curl -I https://tomo-sa.com | grep -E 'x-frame|x-content-type|x-xss|referrer-policy|strict-transport'
# All security headers should be present
```

### Check 5: Cache Status
```bash
curl -I https://tomo-sa.com/assets/main.js | grep -E 'cf-cache-status|age'
# Should see: cf-cache-status: HIT (after first request)
```

---

## 📊 FINAL CHECKLIST

- [ ] All DNS records show orange cloud (☁️)
- [ ] SSL mode is "Full (strict)"
- [ ] All security features enabled
- [ ] Rate limiting rules configured
- [ ] Cache rules configured
- [ ] Speed optimizations enabled
- [ ] HTTPS works on all domains
- [ ] API endpoint responds correctly
- [ ] No direct IP exposure
- [ ] All subdomains behind Cloudflare

---

## 🎯 EXPECTED FINAL STATUS

### DNS Status
- ✅ All domains resolve to Cloudflare IPs
- ✅ All subdomains use CNAME to main domain
- ✅ All records are Proxied (orange cloud ☁️)

### SSL Status
- ✅ Mode: Full (strict)
- ✅ TLS 1.2 + 1.3 enabled
- ✅ TLS 1.0/1.1 disabled
- ✅ Always Use HTTPS: ON

### Security Status
- ✅ WAF: ON
- ✅ Bot Fight Mode: ON
- ✅ Browser Integrity Check: ON
- ✅ Rate Limiting: Active
- ✅ DDoS Protection: ON

### Performance Status
- ✅ Brotli: Enabled
- ✅ HTTP/3: Enabled
- ✅ Early Hints: Enabled
- ✅ Rocket Loader: ON
- ✅ Auto Minify: ON

### Cache Status
- ✅ Static assets: Cached (1 month)
- ✅ API: Bypassed
- ✅ Socket.IO: Bypassed
- ✅ Uploads: Cached (1 month)

---

## 🚨 CRITICAL NOTES

1. **DNS Propagation:** May take 1-24 hours globally
2. **SSL Certificate:** Origin must maintain valid certificate (auto-renews)
3. **Rate Limits:** Monitor and adjust if needed
4. **Rocket Loader:** Test thoroughly - may break some JavaScript
5. **Cache Purge:** Use Cloudflare dashboard to purge cache when needed
6. **Never use Flexible SSL:** Always use Full (strict)

---

## 📞 TROUBLESHOOTING

### Issue: SSL Error
- **Check:** Origin SSL certificate is valid
- **Fix:** Ensure Let's Encrypt auto-renewal is working

### Issue: API Not Working
- **Check:** Cache rules - API should be bypassed
- **Fix:** Verify `/api/*` is set to "Bypass" in cache rules

### Issue: Subdomain Not Working
- **Check:** DNS record is Proxied (orange cloud)
- **Fix:** Ensure CNAME points to main domain, not IP

### Issue: Rate Limiting Too Strict
- **Check:** Security Events in Cloudflare dashboard
- **Fix:** Adjust rate limit values or add bypass rules

---

## ✅ PRODUCTION READY CHECKLIST

- [x] Origin server configured correctly
- [x] SSL certificate valid
- [x] Nginx production-ready
- [x] All documentation created
- [ ] DNS configured in Cloudflare (Manual step)
- [ ] SSL/TLS configured in Cloudflare (Manual step)
- [ ] Security features enabled in Cloudflare (Manual step)
- [ ] Cache rules configured in Cloudflare (Manual step)
- [ ] Speed optimizations enabled in Cloudflare (Manual step)

---

**Status:** ✅ **Server is ready - Cloudflare configuration pending**

**Next Step:** Follow the guides above to configure Cloudflare dashboard manually.

**Last Updated:** 2026-01-24
