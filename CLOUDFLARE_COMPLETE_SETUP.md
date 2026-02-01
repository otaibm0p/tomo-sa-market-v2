# Cloudflare Complete Production Setup - tomo-sa.com

## 🎯 Overview
This guide provides step-by-step instructions to configure Cloudflare for production use with tomo-sa.com and all subdomains.

---

## 📋 Prerequisites Checklist

Before starting, ensure:
- [x] Domain tomo-sa.com is added to Cloudflare account
- [x] Nameservers are updated to Cloudflare nameservers
- [x] Origin server has valid SSL certificate (Let's Encrypt)
- [x] Origin server IP: 138.68.245.29
- [x] Nginx is configured correctly on origin

---

## 1️⃣ DNS SETUP

### Step-by-Step Instructions

1. **Login to Cloudflare Dashboard**
   - Go to: https://dash.cloudflare.com
   - Select domain: `tomo-sa.com`

2. **Navigate to DNS**
   - Click: **DNS** → **Records**

3. **Add A Record (Main Domain)**
   ```
   Type: A
   Name: tomo-sa.com (or @)
   IPv4 address: 138.68.245.29
   Proxy status: ☁️ Proxied (Orange cloud ON)
   TTL: Auto
   ```
   - Click **Save**

4. **Add CNAME Records (Subdomains)**

   **www.tomo-sa.com:**
   ```
   Type: CNAME
   Name: www
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (Orange cloud ON)
   TTL: Auto
   ```

   **admin.tomo-sa.com:**
   ```
   Type: CNAME
   Name: admin
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (Orange cloud ON)
   TTL: Auto
   ```

   **store.tomo-sa.com:**
   ```
   Type: CNAME
   Name: store
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (Orange cloud ON)
   TTL: Auto
   ```

   **driver.tomo-sa.com:**
   ```
   Type: CNAME
   Name: driver
   Target: tomo-sa.com
   Proxy status: ☁️ Proxied (Orange cloud ON)
   TTL: Auto
   ```

### Verification
After adding records:
- All records should show orange cloud (☁️)
- Wait 1-5 minutes for DNS propagation
- Verify: `dig tomo-sa.com` should return Cloudflare IPs

---

## 2️⃣ SSL/TLS CONFIGURATION

### Navigation
**Cloudflare Dashboard** → **SSL/TLS** → **Overview**

### Settings

#### SSL/TLS encryption mode
- **Select:** `Full (strict)`
- **Why:** Most secure, validates origin certificate

#### Edge Certificates Tab
- **Always Use HTTPS:** ✅ ON
- **Automatic HTTPS Rewrites:** ✅ ON
- **Minimum TLS Version:** `TLS 1.2`
- **TLS 1.3:** ✅ Enabled
- **Opportunistic Encryption:** ✅ ON
- **Certificate Transparency Monitoring:** ✅ Enabled

#### Origin Server Tab
- **Authenticated Origin Pulls:** (Optional - for extra security)
- **Minimum TLS Version:** `TLS 1.2`

### Important Notes
- ❌ **Never use Flexible mode** - It's insecure
- ✅ **Full (strict) requires valid SSL on origin** - We have Let's Encrypt
- ✅ **Origin certificate must match domain** - Already configured

---

## 3️⃣ SECURITY CONFIGURATION

### A. Web Application Firewall (WAF)
**Path:** Security → WAF

**Settings:**
- **Status:** ✅ ON
- **Security Level:** Medium
- **Challenge Passage:** 30 minutes

**Managed Rules:**
- ✅ **Cloudflare Managed Ruleset:** ON
- ✅ **OWASP Core Ruleset:** ON
- ✅ **Cloudflare Exposed Credentials Check:** ON

### B. Bot Management
**Path:** Security → Bots

**Settings:**
- **Bot Fight Mode:** ✅ ON
- **Super Bot Fight Mode:** (Optional - requires paid plan)

### C. Browser Integrity Check
**Path:** Security → Settings

**Settings:**
- **Browser Integrity Check:** ✅ ON

### D. DDoS Protection
**Path:** Security → DDoS

**Settings:**
- **HTTP DDoS attack protection:** ✅ ON (Automatic)
- **Network-layer DDoS attack protection:** ✅ ON (Automatic)

### E. Rate Limiting Rules
**Path:** Security → WAF → Rate limiting rules

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

### Option A: Cache Rules (Recommended)
**Path:** Rules → Cache Rules

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

### Option B: Page Rules (If Cache Rules Not Available)
**Path:** Rules → Page Rules

#### Rule 1: API Bypass
```
URL: https://tomo-sa.com/api/*
Settings:
  - Cache Level: Bypass
```

#### Rule 2: Uploads Cache
```
URL: https://tomo-sa.com/uploads/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

#### Rule 3: Static Assets Cache
```
URL: https://tomo-sa.com/*.js OR https://tomo-sa.com/*.css OR https://tomo-sa.com/*.png OR https://tomo-sa.com/*.jpg OR https://tomo-sa.com/*.svg OR https://tomo-sa.com/*.woff OR https://tomo-sa.com/*.woff2
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

---

## 5️⃣ SPEED OPTIMIZATION

### Navigation
**Cloudflare Dashboard** → **Speed** → **Optimization**

### Settings

#### Compression
- **Brotli:** ✅ Enabled

#### Auto Minify
- **HTML:** ✅ ON
- **CSS:** ✅ ON
- **JavaScript:** ✅ ON

#### Network
- **HTTP/3 (with QUIC):** ✅ Enabled
- **0-RTT Connection Resumption:** ✅ Enabled (if available)
- **Early Hints:** ✅ Enabled

#### Optimization
- **Rocket Loader:** ✅ ON
- **Mirage:** (Optional - image optimization)
- **Polish:** (Optional - image compression)

---

## 6️⃣ VERIFICATION STEPS

After completing all configurations:

### Step 1: DNS Verification
```bash
# Check DNS resolution
dig tomo-sa.com A
dig www.tomo-sa.com CNAME
dig admin.tomo-sa.com CNAME

# All should return Cloudflare IPs (104.x.x.x or 172.x.x.x)
```

### Step 2: SSL Verification
```bash
# Check HTTPS connection
curl -I https://tomo-sa.com

# Should see:
# - HTTP/2 200
# - server: cloudflare
# - strict-transport-security header
```

### Step 3: API Verification
```bash
# Test API endpoint
curl https://tomo-sa.com/api/health

# Should return:
# {"ok":true,"status":"healthy","ts":"..."}
```

### Step 4: Security Verification
```bash
# Check security headers
curl -I https://tomo-sa.com | grep -E 'x-frame|x-content-type|x-xss|referrer-policy'

# All security headers should be present
```

### Step 5: Cache Verification
```bash
# Test static asset caching
curl -I https://tomo-sa.com/assets/main.js | grep -E 'cf-cache-status|age'

# Should see: cf-cache-status: HIT (after first request)
```

---

## 7️⃣ FINAL CHECKLIST

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

## 📊 Expected Results

### DNS Status
- All domains resolve to Cloudflare IPs
- All subdomains use CNAME to main domain
- All records are Proxied (orange cloud)

### SSL Status
- Mode: Full (strict)
- TLS 1.2 + 1.3 enabled
- TLS 1.0/1.1 disabled
- Always Use HTTPS: ON

### Security Status
- WAF: ON
- Bot Fight Mode: ON
- Browser Integrity Check: ON
- Rate Limiting: Active
- DDoS Protection: ON

### Performance Status
- Brotli: Enabled
- HTTP/3: Enabled
- Early Hints: Enabled
- Rocket Loader: ON
- Auto Minify: ON

### Cache Status
- Static assets: Cached (1 month)
- API: Bypassed
- Socket.IO: Bypassed
- Uploads: Cached (1 month)

---

## 🚨 Important Notes

1. **DNS Propagation:** May take 1-24 hours globally
2. **SSL Certificate:** Origin must maintain valid certificate
3. **Rate Limits:** Monitor and adjust if needed
4. **Rocket Loader:** Test thoroughly - may break some JavaScript
5. **Cache Purge:** Use Cloudflare dashboard to purge cache when needed

---

## 📞 Support

If issues occur:
1. Check Cloudflare dashboard for errors
2. Verify origin server is accessible
3. Check SSL certificate validity
4. Review Security Events for blocked requests
5. Test API endpoints directly

---

**Last Updated:** 2026-01-24
