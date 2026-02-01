#!/bin/bash
# Cloudflare Setup Verification Script

echo "=========================================="
echo "Cloudflare Configuration Verification"
echo "=========================================="
echo ""

echo "[1] DNS Resolution Check"
echo "------------------------"
echo "tomo-sa.com:"
dig +short tomo-sa.com A | head -1
echo ""
echo "www.tomo-sa.com:"
dig +short www.tomo-sa.com CNAME
echo ""
echo "admin.tomo-sa.com:"
dig +short admin.tomo-sa.com CNAME
echo ""

echo "[2] Cloudflare IP Detection"
echo "---------------------------"
IP=$(dig +short tomo-sa.com A | head -1)
if [[ "$IP" =~ ^(104\.|172\.|173\.|198\.|141\.|188\.|190\.|197\.) ]]; then
  echo "✅ Domain is behind Cloudflare (IP: $IP)"
else
  echo "⚠️  Domain may not be behind Cloudflare (IP: $IP)"
fi
echo ""

echo "[3] SSL/TLS Check"
echo "-----------------"
echo "HTTPS Connection:"
curl -I https://tomo-sa.com 2>&1 | grep -E 'HTTP|server|strict-transport'
echo ""

echo "[4] API Health Check"
echo "--------------------"
curl -s https://tomo-sa.com/api/health
echo ""
echo ""

echo "[5] Headers Check"
echo "-----------------"
echo "Security Headers:"
curl -I https://tomo-sa.com 2>&1 | grep -E 'x-frame|x-content-type|x-xss|referrer-policy|strict-transport'
echo ""

echo "[6] Compression Check"
echo "--------------------"
curl -H "Accept-Encoding: br" -I https://tomo-sa.com 2>&1 | grep -i 'content-encoding'
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
