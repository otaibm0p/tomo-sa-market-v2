# PowerShell Script to Deploy Updates to tomo-sa.com
# Run this script from the project root directory

Write-Host "🚀 Starting Deployment of Updates to tomo-sa.com..." -ForegroundColor Green
Write-Host ""

# Variables
$SERVER_IP = "138.68.245.29"
$SERVER_USER = "root"
$PROJECT_DIR = "C:\Users\Dell\Desktop\tomo-market-v2"
$FRONTEND_DIR = "$PROJECT_DIR\frontend"
$BACKEND_DIR = "$PROJECT_DIR\backend"
$REMOTE_DIR = "/var/www/tomo-market"

# Step 1: Build Frontend
Write-Host "📦 Step 1: Building Frontend..." -ForegroundColor Yellow
Set-Location $FRONTEND_DIR

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "   Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Build
Write-Host "   Building project..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Please check the errors above." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
Write-Host ""

# Step 2: Upload Frontend
Write-Host "📤 Step 2: Uploading Frontend files..." -ForegroundColor Yellow
Set-Location $PROJECT_DIR

# Create dist directory on server if it doesn't exist
Write-Host "   Creating dist directory on server..." -ForegroundColor Cyan
ssh "${SERVER_USER}@${SERVER_IP}" "mkdir -p ${REMOTE_DIR}/frontend/dist"

# Upload dist files
Write-Host "   Uploading files..." -ForegroundColor Cyan
scp -r frontend/dist/* "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/frontend/dist/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Upload failed! Please check your connection." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Frontend files uploaded!" -ForegroundColor Green
Write-Host ""

# Step 3: Upload Backend
Write-Host "📤 Step 3: Uploading Backend files..." -ForegroundColor Yellow

Write-Host "   Uploading server.js..." -ForegroundColor Cyan
scp backend/server.js "${SERVER_USER}@${SERVER_IP}:${REMOTE_DIR}/backend/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend upload failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Backend files uploaded!" -ForegroundColor Green
Write-Host ""

# Step 4: Restart Services on Server
Write-Host "🔄 Step 4: Restarting services on server..." -ForegroundColor Yellow

Write-Host "   Restarting PM2..." -ForegroundColor Cyan
ssh "${SERVER_USER}@${SERVER_IP}" "cd ${REMOTE_DIR} && pm2 restart tomo-market-backend"

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  PM2 restart may have failed. Please check manually." -ForegroundColor Yellow
}

Write-Host "   Reloading Nginx..." -ForegroundColor Cyan
ssh "${SERVER_USER}@${SERVER_IP}" "nginx -t && systemctl reload nginx"

Write-Host "✅ Services restarted!" -ForegroundColor Green
Write-Host ""

# Step 5: Show PM2 logs
Write-Host "📋 Step 5: Checking PM2 logs (last 20 lines)..." -ForegroundColor Yellow
Write-Host ""
ssh "${SERVER_USER}@${SERVER_IP}" "pm2 logs tomo-market-backend --lines 20 --nostream"
Write-Host ""

# Step 6: Summary
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Visit https://tomo-sa.com to verify the site works" -ForegroundColor White
Write-Host "   2. Visit https://tomo-sa.com/admin to check admin panel" -ForegroundColor White
Write-Host "   3. Visit https://tomo-sa.com/admin/marketing to verify marketing section" -ForegroundColor White
Write-Host ""
Write-Host "🔍 To check PM2 status:" -ForegroundColor Cyan
Write-Host "   ssh ${SERVER_USER}@${SERVER_IP} 'pm2 status'" -ForegroundColor White
Write-Host ""
Write-Host "🔍 To view logs:" -ForegroundColor Cyan
Write-Host "   ssh ${SERVER_USER}@${SERVER_IP} 'pm2 logs tomo-market-backend'" -ForegroundColor White
Write-Host ""

