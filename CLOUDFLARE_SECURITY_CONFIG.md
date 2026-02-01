# Cloudflare Security Configuration

## Navigation Path
Cloudflare Dashboard → Security

## Settings

### 1. Web Application Firewall (WAF)
**Path:** Security → WAF

**Configuration:**
- **Status:** ✅ ON
- **Security Level:** Medium
- **Challenge Passage:** 30 minutes

**Managed Rules:**
- ✅ Cloudflare Managed Ruleset: ON
- ✅ OWASP Core Ruleset: ON
- ✅ Cloudflare Exposed Credentials Check: ON

### 2. Bot Management
**Path:** Security → Bots

**Configuration:**
- **Bot Fight Mode:** ✅ ON
- **Super Bot Fight Mode:** (Optional - requires paid plan)

### 3. Browser Integrity Check
**Path:** Security → Settings

**Configuration:**
- **Browser Integrity Check:** ✅ ON

### 4. DDoS Protection
**Path:** Security → DDoS

**Configuration:**
- **HTTP DDoS attack protection:** ✅ ON (Automatic)
- **Network-layer DDoS attack protection:** ✅ ON (Automatic)

---

## Rate Limiting Rules

### Rule 1: API Rate Limit
**Path:** Security → WAF → Rate limiting rules

**Create New Rule:**
```
Rule name: API Rate Limit
Path: /api/*
Rate: 120 requests per 60 seconds
Action: Block for 10 minutes
Bypass: None
```

### Rule 2: Socket.IO Rate Limit
**Create New Rule:**
```
Rule name: Socket.IO Rate Limit
Path: /socket.io/*
Rate: 300 requests per minute
Action: Challenge (CAPTCHA)
Bypass: None
```

---

## Verification

After configuration:
1. Test API with normal requests (should work)
2. Test with excessive requests (should be blocked/challenged)
3. Check Security Events dashboard for blocked requests
