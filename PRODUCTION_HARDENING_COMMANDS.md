# Production Hardening - Exact Commands

## Quick Copy/Paste Commands

### Step 1: Upload and Run Checklist Script

```bash
# On your local machine, upload the script:
scp production-hardening-checklist.sh root@138.68.245.29:/root/

# SSH to server:
ssh root@138.68.245.29

# Make executable and run:
chmod +x /root/production-hardening-checklist.sh
bash /root/production-hardening-checklist.sh
```

### Step 2: Manual Verification Commands (Run After Script)

```bash
# Verify PM2 environment
pm2 show tomo-backend | grep -i "node env"
# Expected: node env          │ production

# Verify PM2 is using ecosystem
pm2 show tomo-backend | grep -E "script path|exec cwd"
# Expected: 
# script path       │ /var/www/tomo-app/backend/server.js
# exec cwd          │ /var/www/tomo-app/backend

# Verify backend health locally
curl -s http://127.0.0.1:3000/api/health
# Expected: {"ok":true,"status":"healthy","ts":"..."}

# Verify backend health via nginx
curl -I https://tomo-sa.com/api/health
# Expected: HTTP/2 200

# Verify nginx syntax
nginx -t
# Expected: syntax is ok ... test is successful

# Verify security headers
curl -I https://tomo-sa.com | grep -i "strict-transport-security"
# Expected: strict-transport-security: max-age=86400; includeSubDomains

# Verify server_tokens is off
curl -I https://tomo-sa.com | grep -i "server:"
# Expected: server: nginx (no version number)

# Verify PM2 log rotation
pm2 list | grep pm2-logrotate
# Expected: pm2-logrotate online

# Verify firewall
ufw status
# Expected: Status: active with rules for 22, 80, 443

# Verify PM2 persists across reboot
pm2 startup
# Run the command it outputs, then:
pm2 save
```

### Step 3: If Ecosystem Was Created, Verify It

```bash
# Check ecosystem file
cat /var/www/tomo-app/backend/ecosystem.config.js

# Restart PM2 to use ecosystem
cd /var/www/tomo-app/backend
pm2 delete tomo-backend
pm2 start ecosystem.config.js
pm2 save

# Verify it's running
pm2 show tomo-backend
```

## Expected Outputs

### PM2 Environment Check
```
node env          │ production
```

### Health Endpoint Check
```json
{"ok":true,"status":"healthy","ts":"2026-01-25T..."}
```

### Nginx Syntax Check
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Security Headers Check
```
HTTP/2 200
strict-transport-security: max-age=86400; includeSubDomains
x-frame-options: DENY
x-content-type-options: nosniff
server: nginx
```

### Firewall Check
```
Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere
```

## Troubleshooting

### If PM2 NODE_ENV is not production:
```bash
cd /var/www/tomo-app/backend
NODE_ENV=production pm2 restart tomo-backend --update-env
pm2 save
```

### If nginx syntax fails:
```bash
# Restore backup
cp /root/production_backup_*/nginx_site_*.conf /etc/nginx/sites-enabled/tomo-sa.com
nginx -t
systemctl reload nginx
```

### If backend not responding:
```bash
# Check PM2 status
pm2 status
pm2 logs tomo-backend --lines 50

# Check if port 3000 is listening
netstat -tlnp | grep 3000
# or
ss -tlnp | grep 3000
```

### If ecosystem.config.js is missing:
The script will create it automatically. If you need to create manually:

```bash
cat > /var/www/tomo-app/backend/ecosystem.config.js << 'EOF'
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

cd /var/www/tomo-app/backend
pm2 delete tomo-backend
pm2 start ecosystem.config.js
pm2 save
```
