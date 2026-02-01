# Simple Deployment Script
# Run this from project root directory

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-market"

Write-Host "Starting deployment..." -ForegroundColor Green
Write-Host ""
Write-Host "You will be asked for SSH password multiple times" -ForegroundColor Yellow
Write-Host ""

# Step 1: Upload Frontend
Write-Host "[1/4] Uploading Frontend..." -ForegroundColor Cyan
Set-Location frontend\dist
scp -r * "${SERVER}:${REMOTE_DIR}/frontend/dist/"
Set-Location ..\..

# Step 2: Upload Backend
Write-Host "[2/4] Uploading Backend..." -ForegroundColor Cyan
scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"

# Step 3: Upload Config Files
Write-Host "[3/4] Uploading Config Files..." -ForegroundColor Cyan
scp nginx.conf "${SERVER}:/etc/nginx/sites-available/tomo-sa.com"
scp ecosystem.config.js "${SERVER}:${REMOTE_DIR}/"

# Step 4: Restart Services
Write-Host "[4/4] Restarting Services..." -ForegroundColor Cyan
ssh $SERVER "cd $REMOTE_DIR && pm2 restart tomo-market-backend && pm2 save"
ssh $SERVER "nginx -t && systemctl reload nginx"

Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Check:" -ForegroundColor Cyan
Write-Host "  https://tomo-sa.com" -ForegroundColor White
Write-Host "  https://tomo-sa.com/admin" -ForegroundColor White
Write-Host ""

