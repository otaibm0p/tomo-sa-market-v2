# Cloudflare SSL/TLS Configuration

## Navigation Path
Cloudflare Dashboard → SSL/TLS → Overview

## Settings

### SSL/TLS encryption mode
**Select:** `Full (strict)`

**Why:** 
- Cloudflare validates origin certificate
- Most secure option
- Requires valid SSL on origin (we have Let's Encrypt)

### Edge Certificates Tab

#### Always Use HTTPS
- **Status:** ✅ ON
- **Action:** Redirects all HTTP to HTTPS

#### Automatic HTTPS Rewrites
- **Status:** ✅ ON
- **Action:** Rewrites HTTP links to HTTPS

#### Minimum TLS Version
- **Select:** TLS 1.2
- **Action:** Blocks TLS 1.0 and 1.1

#### TLS 1.3
- **Status:** ✅ Enabled
- **Action:** Uses latest TLS version

#### Opportunistic Encryption
- **Status:** ✅ ON
- **Action:** Enables HTTP/2 Server Push

#### Certificate Transparency Monitoring
- **Status:** ✅ Enabled
- **Action:** Monitors certificate issuance

---

## Origin Server Requirements

For "Full (strict)" mode, origin must:
1. ✅ Have valid SSL certificate (Let's Encrypt)
2. ✅ Certificate matches domain
3. ✅ Certificate is not expired
4. ✅ Certificate chain is complete

**Current Status:** ✅ All requirements met
