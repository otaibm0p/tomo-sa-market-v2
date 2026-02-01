# Upload Drivers Fix Migration to Server
$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-market"

Write-Host "Uploading Migration Files to Server..." -ForegroundColor Green
Write-Host ""

# Create directories on server first
Write-Host "Creating directories on server..." -ForegroundColor Yellow
ssh $SERVER "mkdir -p ${REMOTE_DIR}/backend/migrations"

# Upload Migration Files
Write-Host "[1/3] Uploading migration files..." -ForegroundColor Yellow
scp "backend\migrations\0007_fix_drivers_foreign_key.sql" "${SERVER}:${REMOTE_DIR}/backend/migrations/"

if (Test-Path "backend\migrations\0007_fix_drivers_foreign_key_mysql.sql") {
    scp "backend\migrations\0007_fix_drivers_foreign_key_mysql.sql" "${SERVER}:${REMOTE_DIR}/backend/migrations/"
}

# Upload Run Script
Write-Host "[2/3] Uploading run script..." -ForegroundColor Yellow
scp "backend\run-drivers-fix-simple.js" "${SERVER}:${REMOTE_DIR}/backend/"

# Upload Documentation
Write-Host "[3/3] Uploading documentation..." -ForegroundColor Yellow
if (Test-Path "backend\migrations\README_DRIVERS_FIX.md") {
    scp "backend\migrations\README_DRIVERS_FIX.md" "${SERVER}:${REMOTE_DIR}/backend/migrations/"
}

Write-Host ""
Write-Host "Upload completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. SSH to server: ssh root@138.68.245.29" -ForegroundColor Cyan
Write-Host "  2. Go to: cd /var/www/tomo-market/backend" -ForegroundColor Cyan
Write-Host "  3. Run: node run-drivers-fix-simple.js" -ForegroundColor Cyan
Write-Host ""
