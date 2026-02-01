# Cloudflare Production Setup Guide - tomo-sa.com

## 📋 DNS Configuration

### A Record (Main Domain)
```
Type: A
Name: tomo-sa.com
IPv4 address: 138.68.245.29
Proxy status: ☁️ Proxied (ON)
TTL: Auto
```

### CNAME Records (Subdomains)
```
Type: CNAME
Name: www
Target: tomo-sa.com
Proxy status: ☁️ Proxied (ON)
TTL: Auto

Type: CNAME
Name: admin
Target: tomo-sa.com
Proxy status: ☁️ Proxied (ON)
TTL: Auto

Type: CNAME
Name: store
Target: tomo-sa.com
Proxy status: ☁️ Proxied (ON)
TTL: Auto

Type: CNAME
Name: driver
Target: tomo-sa.com
Proxy status: ☁️ Proxied (ON)
TTL: Auto
```

**Important:** All subdomains must be Proxied (orange cloud ☁️) to hide origin IP.

---

## 🔐 SSL/TLS Configuration

### SSL/TLS Settings
- **SSL/TLS encryption mode:** `Full (strict)`
- **Always Use HTTPS:** ✅ ON
- **Automatic HTTPS Rewrites:** ✅ ON
- **Minimum TLS Version:** TLS 1.2
- **TLS 1.3:** ✅ Enabled
- **Opportunistic Encryption:** ✅ ON
- **TLS 1.0:** ❌ Disabled
- **TLS 1.1:** ❌ Disabled

### Edge Certificates
- **Always Use HTTPS:** ✅ Enabled
- **Automatic HTTPS Rewrites:** ✅ Enabled
- **Minimum TLS Version:** 1.2
- **Opportunistic Encryption:** ✅ Enabled
- **TLS 1.3:** ✅ Enabled
- **Certificate Transparency Monitoring:** ✅ Enabled

---

## 🛡️ Security Configuration

### Web Application Firewall (WAF)
- **Status:** ✅ ON
- **Security Level:** Medium
- **Challenge Passage:** 30 minutes

### Managed Rules
- **Cloudflare Managed Ruleset:** ✅ ON
- **OWASP Core Ruleset:** ✅ ON
- **Cloudflare Exposed Credentials Check:** ✅ ON

### Bot Management
- **Bot Fight Mode:** ✅ ON
- **Super Bot Fight Mode:** (Optional - Paid feature)

### Browser Integrity Check
- **Browser Integrity Check:** ✅ ON

### DDoS Protection
- **HTTP DDoS attack protection:** ✅ ON (Automatic)
- **Network-layer DDoS attack protection:** ✅ ON (Automatic)

### Rate Limiting Rules

#### Rule 1: API Rate Limit
```
Path: /api/*
Rate: 120 requests per 60 seconds
Action: Block for 10 minutes
Bypass: None
```

#### Rule 2: Socket.IO Rate Limit
```
Path: /socket.io/*
Rate: 300 requests per minute
Action: Challenge (CAPTCHA)
Bypass: None
```

---

## ⚡ Performance & Caching

### Caching Rules

#### Cache Everything (Static Assets)
```
URL Pattern: *tomo-sa.com/*.js
Cache Level: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.css
Cache Level: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.png
Cache Level: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.jpg
Cache Level: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.jpeg
Cache Pattern: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.svg
Cache Level: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.webp
Cache Level: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.woff
Cache Level: Cache Everything
Edge Cache TTL: 1 month

URL Pattern: *tomo-sa.com/*.woff2
Cache Level: Cache Everything
Edge Cache TTL: 1 month
```

#### Bypass Cache (Dynamic Content)
```
URL Pattern: *tomo-sa.com/api/*
Cache Level: Bypass

URL Pattern: *tomo-sa.com/socket.io/*
Cache Level: Bypass
```

### Speed Optimization
- **Brotli:** ✅ Enabled
- **HTTP/3 (with QUIC):** ✅ Enabled
- **Early Hints:** ✅ Enabled
- **Rocket Loader:** ✅ ON
- **Auto Minify:**
  - HTML: ✅ ON
  - CSS: ✅ ON
  - JavaScript: ✅ ON

### Page Rules (Alternative to Cache Rules)

#### Rule 1: API Bypass
```
URL: https://tomo-sa.com/api/*
Settings:
  - Cache Level: Bypass
  - Disable Security: OFF
```

#### Rule 2: Uploads Cache
```
URL: https://tomo-sa.com/uploads/*
Settings:
  - Cache Level: Cache Everything
  - Edge Cache TTL: 1 month
```

---

## 🔧 Origin Server Configuration

### Required Nginx Settings for Cloudflare

The origin server must:
1. Accept connections from Cloudflare IPs
2. Use Full (strict) SSL mode
3. Have valid SSL certificate
4. Support HTTP/2
5. Set correct headers for Cloudflare

### Cloudflare IP Ranges
Ensure your firewall allows:
- IPv4: https://www.cloudflare.com/ips-v4
- IPv6: https://www.cloudflare.com/ips-v6

---

## ✅ Verification Checklist

After setup, verify:

- [ ] All domains show orange cloud (☁️) in DNS
- [ ] SSL mode is "Full (strict)"
- [ ] HTTPS works on all domains
- [ ] API endpoint responds: `curl https://tomo-sa.com/api/health`
- [ ] Static assets are cached
- [ ] API requests bypass cache
- [ ] Rate limiting is active
- [ ] WAF is blocking malicious requests
- [ ] No direct IP exposure

---

## 📊 Monitoring

### Recommended Cloudflare Analytics
- **Security Events:** Monitor blocked requests
- **Performance:** Check cache hit ratio
- **Traffic:** Monitor bandwidth usage
- **Rate Limiting:** Track blocked/challenged requests

---

## 🚨 Important Notes

1. **Never use Flexible SSL** - Always use Full (strict)
2. **Always proxy subdomains** - Never expose origin IP
3. **Test API after changes** - Ensure backend still works
4. **Monitor rate limits** - Adjust if needed
5. **Keep origin SSL valid** - Cloudflare validates origin certificate

---

**Last Updated:** 2026-01-24
