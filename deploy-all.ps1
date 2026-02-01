# Deploy All Updates to tomo-sa.com
# This script will upload all updated files to the server

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-market"

Write-Host "Starting deployment to tomo-sa.com..." -ForegroundColor Green
Write-Host ""

# Step 1: Upload Frontend
Write-Host "Step 1: Uploading Frontend files..." -ForegroundColor Yellow
Set-Location frontend\dist
Write-Host "   Uploading files from frontend/dist..." -ForegroundColor Cyan
scp -r * "${SERVER}:${REMOTE_DIR}/frontend/dist/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Frontend uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "   Frontend upload may require SSH password" -ForegroundColor Yellow
}
Set-Location ..\..

# Step 2: Upload Backend
Write-Host ""
Write-Host "Step 2: Uploading Backend files..." -ForegroundColor Yellow
scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Backend uploaded successfully!" -ForegroundColor Green
} else {
    Write-Host "   Backend upload may require SSH password" -ForegroundColor Yellow
}

# Step 3: Upload Config Files
Write-Host ""
Write-Host "Step 3: Uploading configuration files..." -ForegroundColor Yellow
scp nginx.conf "${SERVER}:/etc/nginx/sites-available/tomo-sa.com"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   nginx.conf uploaded!" -ForegroundColor Green
} else {
    Write-Host "   nginx.conf upload may require SSH password" -ForegroundColor Yellow
}

scp ecosystem.config.js "${SERVER}:${REMOTE_DIR}/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ecosystem.config.js uploaded!" -ForegroundColor Green
} else {
    Write-Host "   ecosystem.config.js upload may require SSH password" -ForegroundColor Yellow
}

# Step 4: Restart Services
Write-Host ""
Write-Host "Step 4: Restarting services on server..." -ForegroundColor Yellow
Write-Host "   (You may need to enter SSH password)" -ForegroundColor Cyan
ssh $SERVER "cd $REMOTE_DIR && nginx -t && systemctl reload nginx && pm2 delete tomo-market-backend 2>/dev/null; pm2 start ecosystem.config.js && pm2 save"
if ($LASTEXITCODE -eq 0) {
    Write-Host "   Services restarted successfully!" -ForegroundColor Green
} else {
    Write-Host "   Service restart may require manual intervention" -ForegroundColor Yellow
}

# Step 5: Check Status
Write-Host ""
Write-Host "Step 5: Checking PM2 status..." -ForegroundColor Yellow
ssh $SERVER "pm2 status"

Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Please verify:" -ForegroundColor Cyan
Write-Host "   https://tomo-sa.com" -ForegroundColor White
Write-Host "   https://tomo-sa.com/admin" -ForegroundColor White
Write-Host "   https://tomo-sa.com/admin/marketing" -ForegroundColor White
Write-Host ""


