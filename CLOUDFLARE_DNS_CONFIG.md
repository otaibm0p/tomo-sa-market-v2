# Cloudflare DNS Configuration - Step by Step

## DNS Records to Add in Cloudflare Dashboard

### Step 1: Add A Record (Main Domain)
1. Go to Cloudflare Dashboard → DNS → Records
2. Click "Add record"
3. Configure:
   - **Type:** A
   - **Name:** `tomo-sa.com` (or `@`)
   - **IPv4 address:** `138.68.245.29`
   - **Proxy status:** ☁️ Proxied (Orange cloud ON)
   - **TTL:** Auto
4. Click "Save"

### Step 2: Add CNAME Records (Subdomains)

#### www.tomo-sa.com
1. Click "Add record"
2. Configure:
   - **Type:** CNAME
   - **Name:** `www`
   - **Target:** `tomo-sa.com`
   - **Proxy status:** ☁️ Proxied (Orange cloud ON)
   - **TTL:** Auto
3. Click "Save"

#### admin.tomo-sa.com
1. Click "Add record"
2. Configure:
   - **Type:** CNAME
   - **Name:** `admin`
   - **Target:** `tomo-sa.com`
   - **Proxy status:** ☁️ Proxied (Orange cloud ON)
   - **TTL:** Auto
3. Click "Save"

#### store.tomo-sa.com
1. Click "Add record"
2. Configure:
   - **Type:** CNAME
   - **Name:** `store`
   - **Target:** `tomo-sa.com`
   - **Proxy status:** ☁️ Proxied (Orange cloud ON)
   - **TTL:** Auto
3. Click "Save"

#### driver.tomo-sa.com
1. Click "Add record"
2. Configure:
   - **Type:** CNAME
   - **Name:** `driver`
   - **Target:** `tomo-sa.com`
   - **Proxy status:** ☁️ Proxied (Orange cloud ON)
   - **TTL:** Auto
3. Click "Save"

---

## Final DNS Table

| Type | Name | Target/Content | Proxy | TTL |
|------|------|---------------|-------|-----|
| A | tomo-sa.com | 138.68.245.29 | ☁️ ON | Auto |
| CNAME | www | tomo-sa.com | ☁️ ON | Auto |
| CNAME | admin | tomo-sa.com | ☁️ ON | Auto |
| CNAME | store | tomo-sa.com | ☁️ ON | Auto |
| CNAME | driver | tomo-sa.com | ☁️ ON | Auto |

---

## Verification

After adding records, verify:
1. All records show orange cloud (☁️)
2. DNS propagation: `dig tomo-sa.com` or `nslookup tomo-sa.com`
3. All subdomains resolve correctly
