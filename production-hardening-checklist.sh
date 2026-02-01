#!/bin/bash
# Production Hardening Checklist for tomo-sa.com
# Run as root on server: 138.68.245.29
# Usage: bash production-hardening-checklist.sh

set -e  # Exit on error

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/root/production_backup_${TIMESTAMP}"
APP_DIR="/var/www/tomo-app"
BACKEND_DIR="${APP_DIR}/backend"
NGINX_CONFIG="/etc/nginx/sites-enabled/tomo-sa.com"
NGINX_MAIN="/etc/nginx/nginx.conf"

echo "=========================================="
echo "TOMO Production Hardening Checklist"
echo "Timestamp: ${TIMESTAMP}"
echo "=========================================="
echo ""

# ============================================
# STAGE 1: BACKUPS
# ============================================
echo "[STAGE 1] Creating backups..."
mkdir -p "${BACKUP_DIR}"

# Backup nginx configs
echo "  → Backing up nginx configs..."
cp -a /etc/nginx "${BACKUP_DIR}/nginx_${TIMESTAMP}"
cp "${NGINX_CONFIG}" "${BACKUP_DIR}/nginx_site_${TIMESTAMP}.conf" 2>/dev/null || echo "  ⚠️  Site config not found"

# Backup .env if exists
echo "  → Backing up .env files..."
find "${BACKEND_DIR}" -name ".env" -exec cp {} "${BACKUP_DIR}/env_${TIMESTAMP}" \; 2>/dev/null || echo "  ⚠️  .env not found"

# Backup PM2 ecosystem if exists
echo "  → Backing up PM2 ecosystem..."
if [ -f "${BACKEND_DIR}/ecosystem.config.js" ]; then
  cp "${BACKEND_DIR}/ecosystem.config.js" "${BACKUP_DIR}/ecosystem_${TIMESTAMP}.js"
elif [ -f "${APP_DIR}/ecosystem.config.js" ]; then
  cp "${APP_DIR}/ecosystem.config.js" "${BACKUP_DIR}/ecosystem_${TIMESTAMP}.js"
else
  echo "  ⚠️  ecosystem.config.js not found (will create)"
fi

# Backup PM2 dump
echo "  → Backing up PM2 process list..."
pm2 save 2>/dev/null || true
cp ~/.pm2/dump.pm2 "${BACKUP_DIR}/pm2_dump_${TIMESTAMP}.pm2" 2>/dev/null || echo "  ⚠️  PM2 dump not found"

echo "✅ Backups saved to: ${BACKUP_DIR}"
echo ""

# ============================================
# STAGE 2: NGINX CONFIG VERIFICATION
# ============================================
echo "[STAGE 2] Verifying nginx configuration..."

# Check for duplicate server blocks
echo "  → Checking for duplicate server_name blocks..."
SERVER_NAMES=$(grep -E "^\s*server_name" "${NGINX_CONFIG}" 2>/dev/null | wc -l || echo "0")
if [ "${SERVER_NAMES}" -gt 10 ]; then
  echo "  ⚠️  Warning: Many server_name blocks found (${SERVER_NAMES})"
else
  echo "  ✅ Server blocks count: ${SERVER_NAMES}"
fi

# Check HTTP redirect preserves host
echo "  → Verifying HTTP→HTTPS redirect preserves host..."
if grep -q "return 301 https://\$host\$request_uri" "${NGINX_CONFIG}" 2>/dev/null; then
  echo "  ✅ HTTP redirect uses \$host (preserves requested domain)"
elif grep -q "return 301 https://" "${NGINX_CONFIG}" 2>/dev/null; then
  echo "  ⚠️  HTTP redirect found but may not preserve host"
else
  echo "  ❌ HTTP redirect not found"
fi

# Test nginx syntax
echo "  → Testing nginx syntax..."
if nginx -t 2>&1 | grep -q "syntax is ok"; then
  echo "  ✅ Nginx syntax is valid"
else
  echo "  ❌ Nginx syntax error!"
  nginx -t
  exit 1
fi

echo ""

# ============================================
# STAGE 3: SECURITY HEADERS VERIFICATION
# ============================================
echo "[STAGE 3] Verifying security headers..."

# Check server_tokens off
echo "  → Checking server_tokens..."
if grep -qE "^\s*server_tokens\s+off" "${NGINX_MAIN}" 2>/dev/null; then
  echo "  ✅ server_tokens is off"
else
  echo "  ⚠️  server_tokens may be enabled (check manually)"
fi

# Check HSTS header
echo "  → Checking HSTS header..."
if grep -q "Strict-Transport-Security.*max-age=86400.*includeSubDomains" "${NGINX_CONFIG}" 2>/dev/null; then
  echo "  ✅ HSTS header found with max-age=86400 and includeSubDomains"
else
  echo "  ⚠️  HSTS header may be missing or incorrect"
fi

# Check other security headers
echo "  → Checking other security headers..."
HEADERS=("X-Frame-Options" "X-Content-Type-Options" "X-XSS-Protection" "Referrer-Policy")
for header in "${HEADERS[@]}"; do
  if grep -qi "${header}" "${NGINX_CONFIG}" 2>/dev/null; then
    echo "  ✅ ${header} found"
  else
    echo "  ⚠️  ${header} may be missing"
  fi
done

echo ""

# ============================================
# STAGE 4: PM2 ENVIRONMENT VERIFICATION
# ============================================
echo "[STAGE 4] Verifying PM2 environment..."

# Check current PM2 env
echo "  → Checking current PM2 process environment..."
PM2_ENV=$(pm2 show tomo-backend 2>/dev/null | grep "node env" | awk '{print $NF}' || echo "unknown")
echo "  Current NODE_ENV: ${PM2_ENV}"

if [ "${PM2_ENV}" = "production" ]; then
  echo "  ✅ NODE_ENV is production"
else
  echo "  ⚠️  NODE_ENV is not production (${PM2_ENV})"
fi

# Check if ecosystem exists
if [ -f "${BACKEND_DIR}/ecosystem.config.js" ] || [ -f "${APP_DIR}/ecosystem.config.js" ]; then
  echo "  ✅ ecosystem.config.js exists"
  ECOSYSTEM_FILE=$(find "${APP_DIR}" "${BACKEND_DIR}" -name "ecosystem.config.js" -type f | head -1)
  echo "  Location: ${ECOSYSTEM_FILE}"
else
  echo "  ⚠️  ecosystem.config.js not found - will create"
  ECOSYSTEM_FILE="${BACKEND_DIR}/ecosystem.config.js"
fi

echo ""

# ============================================
# STAGE 5: PM2 ECOSYSTEM CREATION/UPDATE
# ============================================
echo "[STAGE 5] Ensuring PM2 ecosystem.config.js exists..."

if [ ! -f "${ECOSYSTEM_FILE}" ]; then
  echo "  → Creating ecosystem.config.js..."
  cat > "${ECOSYSTEM_FILE}" << 'EOF'
module.exports = {
  apps: [{
    name: 'tomo-backend',
    script: './server.js',
    cwd: '/var/www/tomo-app/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    min_uptime: '10s',
    max_restarts: 10
  }]
};
EOF
  echo "  ✅ Created ${ECOSYSTEM_FILE}"
else
  echo "  ✅ ecosystem.config.js already exists"
  # Verify it has NODE_ENV=production
  if grep -q "NODE_ENV.*production" "${ECOSYSTEM_FILE}"; then
    echo "  ✅ Contains NODE_ENV=production"
  else
    echo "  ⚠️  May need NODE_ENV=production added"
  fi
fi

# Restart PM2 with ecosystem
echo "  → Restarting PM2 with ecosystem..."
cd "${BACKEND_DIR}"
pm2 delete tomo-backend 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo "  ✅ PM2 restarted with ecosystem.config.js"
echo ""

# ============================================
# STAGE 6: PM2 LOG ROTATION
# ============================================
echo "[STAGE 6] Setting up PM2 log rotation..."

# Install pm2-logrotate if not exists
if ! pm2 list | grep -q "pm2-logrotate"; then
  echo "  → Installing pm2-logrotate..."
  pm2 install pm2-logrotate
  pm2 set pm2-logrotate:max_size 50M
  pm2 set pm2-logrotate:retain 7
  pm2 set pm2-logrotate:compress true
  echo "  ✅ pm2-logrotate installed and configured"
else
  echo "  ✅ pm2-logrotate already installed"
fi

# Verify log paths
echo "  → Verifying log paths..."
LOG_DIR="${BACKEND_DIR}/logs"
mkdir -p "${LOG_DIR}"
chown -R $(whoami) "${LOG_DIR}" 2>/dev/null || true
echo "  ✅ Log directory: ${LOG_DIR}"

echo ""

# ============================================
# STAGE 7: FIREWALL VERIFICATION
# ============================================
echo "[STAGE 7] Verifying firewall (ufw) rules..."

if command -v ufw >/dev/null 2>&1; then
  UFW_STATUS=$(ufw status | head -1 || echo "inactive")
  echo "  UFW Status: ${UFW_STATUS}"
  
  if echo "${UFW_STATUS}" | grep -qi "active"; then
    echo "  → Checking allowed ports..."
    ALLOWED=$(ufw status | grep -E "ALLOW|22|80|443" | wc -l || echo "0")
    echo "  ✅ Firewall is active with ${ALLOWED} rules"
    
    # Check specific ports
    if ufw status | grep -q "22/tcp"; then
      echo "  ✅ Port 22 (SSH) is allowed"
    else
      echo "  ⚠️  Port 22 may not be explicitly allowed"
    fi
    
    if ufw status | grep -q "80/tcp"; then
      echo "  ✅ Port 80 (HTTP) is allowed"
    else
      echo "  ⚠️  Port 80 may not be explicitly allowed"
    fi
    
    if ufw status | grep -q "443/tcp"; then
      echo "  ✅ Port 443 (HTTPS) is allowed"
    else
      echo "  ⚠️  Port 443 may not be explicitly allowed"
    fi
  else
    echo "  ⚠️  UFW is not active - consider enabling"
  fi
else
  echo "  ⚠️  ufw command not found"
fi

echo ""

# ============================================
# STAGE 8: PATHS AND PERMISSIONS
# ============================================
echo "[STAGE 8] Verifying paths and permissions..."

# Check frontend dist
FRONTEND_DIST="${APP_DIR}/frontend/dist"
if [ -d "${FRONTEND_DIST}" ]; then
  echo "  ✅ Frontend dist exists: ${FRONTEND_DIST}"
  DIST_FILES=$(find "${FRONTEND_DIST}" -type f | wc -l)
  echo "  Files in dist: ${DIST_FILES}"
else
  echo "  ❌ Frontend dist not found: ${FRONTEND_DIST}"
fi

# Check uploads path
UPLOADS_DIR="${APP_DIR}/uploads"
if [ -d "${UPLOADS_DIR}" ]; then
  echo "  ✅ Uploads directory exists: ${UPLOADS_DIR}"
  UPLOADS_PERM=$(stat -c "%a" "${UPLOADS_DIR}" 2>/dev/null || echo "unknown")
  echo "  Permissions: ${UPLOADS_PERM}"
else
  echo "  ⚠️  Uploads directory not found, creating..."
  mkdir -p "${UPLOADS_DIR}"
  chmod 755 "${UPLOADS_DIR}"
  echo "  ✅ Created ${UPLOADS_DIR}"
fi

# Check backend directory
if [ -d "${BACKEND_DIR}" ]; then
  echo "  ✅ Backend directory exists: ${BACKEND_DIR}"
  if [ -f "${BACKEND_DIR}/server.js" ]; then
    echo "  ✅ server.js exists"
  else
    echo "  ❌ server.js not found"
  fi
else
  echo "  ❌ Backend directory not found"
fi

echo ""

# ============================================
# STAGE 9: BACKEND RESPONSE VERIFICATION
# ============================================
echo "[STAGE 9] Verifying backend responses..."

# Test local backend
echo "  → Testing local backend (127.0.0.1:3000)..."
if curl -s -f -m 5 http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
  LOCAL_RESPONSE=$(curl -s -m 5 http://127.0.0.1:3000/api/health)
  echo "  ✅ Local backend responds"
  echo "  Response: ${LOCAL_RESPONSE}"
else
  echo "  ❌ Local backend not responding"
fi

# Test via nginx
echo "  → Testing via nginx (https://tomo-sa.com/api/health)..."
if curl -s -f -m 10 https://tomo-sa.com/api/health > /dev/null 2>&1; then
  NGINX_RESPONSE=$(curl -s -m 10 https://tomo-sa.com/api/health)
  echo "  ✅ Nginx proxy works"
  echo "  Response: ${NGINX_RESPONSE}"
else
  echo "  ❌ Nginx proxy not responding"
fi

# Test admin insights
echo "  → Testing admin insights endpoint..."
if curl -s -f -m 10 https://tomo-sa.com/api/ai/admin-insights > /dev/null 2>&1; then
  echo "  ✅ Admin insights endpoint responds"
else
  echo "  ⚠️  Admin insights endpoint may require auth"
fi

echo ""

# ============================================
# FINAL SUMMARY
# ============================================
echo "=========================================="
echo "PRODUCTION HARDENING CHECKLIST COMPLETE"
echo "=========================================="
echo ""
echo "Backup location: ${BACKUP_DIR}"
echo ""
echo "Next steps:"
echo "1. Review any ⚠️  warnings above"
echo "2. Test endpoints manually"
echo "3. Monitor PM2 logs: pm2 logs tomo-backend"
echo "4. Monitor nginx logs: tail -f /var/log/nginx/error.log"
echo ""
echo "Verification commands:"
echo "  pm2 show tomo-backend | grep 'node env'"
echo "  curl -I https://tomo-sa.com/api/health"
echo "  nginx -t"
echo "  pm2 list"
echo ""
