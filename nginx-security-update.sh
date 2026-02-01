#!/bin/bash
set -e

echo "==[0] Backup nginx configs =="
TS="$(date +%F_%H%M%S)"
BK="/root/nginx_fast_backup_$TS"
sudo mkdir -p "$BK"
sudo cp -a /etc/nginx "$BK/"
echo "Backup saved: $BK"

echo "==[1] Hide nginx version (server_tokens off) =="
NGX="/etc/nginx/nginx.conf"
if sudo grep -qE '^\s*server_tokens\s+' "$NGX"; then
  sudo sed -i 's/^\s*server_tokens\s\+.*/    server_tokens off;/' "$NGX"
else
  sudo perl -0777 -i -pe 's/http\s*\{\n/http {\n    server_tokens off;\n/s' "$NGX"
fi

echo "==[2] Add SAFE HSTS (max-age=86400) to tomo site HTTPS blocks =="
CFG="/etc/nginx/sites-enabled/tomo-sa.com"

if ! sudo grep -q "Strict-Transport-Security" "$CFG"; then
  if sudo grep -q "Referrer-Policy" "$CFG"; then
    sudo perl -0777 -i -pe 's/(add_header\s+Referrer-Policy[^\n]*\n)/$1    add_header Strict-Transport-Security "max-age=86400; includeSubDomains" always;\n/s' "$CFG"
  elif sudo grep -q "X-Frame-Options" "$CFG"; then
    sudo perl -0777 -i -pe 's/(add_header\s+X-Frame-Options[^\n]*\n)/$1    add_header Strict-Transport-Security "max-age=86400; includeSubDomains" always;\n/s' "$CFG"
  else
    sudo perl -0777 -i -pe 's/(listen\s+443[^\n]*\n)/$1\n    add_header Strict-Transport-Security "max-age=86400; includeSubDomains" always;\n/s' "$CFG"
  fi
else
  echo "HSTS already present, skipping"
fi

echo "==[3] Test & Reload =="
sudo nginx -t
sudo systemctl reload nginx

echo "==[4] Quick checks =="
echo "--- Headers check (HSTS should appear) ---"
curl -I https://tomo-sa.com | head -n 20
echo "--- Health check ---"
curl -s https://tomo-sa.com/api/health && echo

echo "DONE ✅"
