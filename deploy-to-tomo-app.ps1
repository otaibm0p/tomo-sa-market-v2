# Deploy Frontend and Admin changes to /var/www/tomo-app
# This script will sync frontend/src to the production server

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-app"
$LOCAL_SRC = "frontend\src"
$REMOTE_SRC = "$REMOTE_DIR/frontend/src"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deploying to /var/www/tomo-app" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Upload all frontend/src files
Write-Host "[1/6] Uploading frontend/src files..." -ForegroundColor Yellow
Write-Host "   Source: $LOCAL_SRC" -ForegroundColor Gray
Write-Host "   Destination: $REMOTE_SRC" -ForegroundColor Gray
Write-Host ""

Set-Location $LOCAL_SRC

# Get all files recursively
$allFiles = Get-ChildItem -Recurse -File

Write-Host "   Found $($allFiles.Count) files to upload" -ForegroundColor Cyan
Write-Host ""

# Upload each file
$uploaded = 0
foreach ($file in $allFiles) {
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    $remotePath = "$REMOTE_SRC/$relativePath"
    $remoteDir = Split-Path $remotePath -Parent
    
    Write-Host "   [$($uploaded + 1)/$($allFiles.Count)] $relativePath" -ForegroundColor Gray
    
    # Create remote directory first
    ssh $SERVER "mkdir -p `"$remoteDir`"" 2>&1 | Out-Null
    
    # Upload file
    scp $file.FullName "${SERVER}:$remotePath" 2>&1 | Out-Null
    
    $uploaded++
}

Set-Location ..\..

Write-Host ""
Write-Host "   Uploaded $uploaded files" -ForegroundColor Green
Write-Host ""

# Step 2: List changed files
Write-Host "[2/6] Listing changed files on server..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR && git diff --name-only frontend/src 2>/dev/null || find frontend/src -type f -newer frontend/dist/index.html 2>/dev/null || echo 'All files synced'" 2>&1
Write-Host ""

# Step 3: Install dependencies
Write-Host "[3/6] Installing frontend dependencies..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR/frontend && npm install" 2>&1
Write-Host ""

# Step 4: Build production
Write-Host "[4/6] Building production (npm run build)..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR/frontend && npm run build" 2>&1
Write-Host ""

# Step 5: Restart backend
Write-Host "[5/6] Restarting backend (PM2)..." -ForegroundColor Yellow
ssh $SERVER "pm2 restart tomo-backend && pm2 save" 2>&1
Write-Host ""

# Step 6: Verify
Write-Host "[6/6] Verifying deployment..." -ForegroundColor Yellow
Write-Host ""

# Check dist was updated
Write-Host "   Checking dist/index.html timestamp..." -ForegroundColor Cyan
ssh $SERVER "stat $REMOTE_DIR/frontend/dist/index.html 2>/dev/null || echo 'dist/index.html not found'" 2>&1
Write-Host ""

# Check PM2 status
Write-Host "   PM2 Status:" -ForegroundColor Cyan
ssh $SERVER "pm2 status tomo-backend" 2>&1
Write-Host ""

# Check backend logs for serving message
Write-Host "   Backend logs (last 10 lines):" -ForegroundColor Cyan
ssh $SERVER "pm2 logs tomo-backend --lines 10 --nostream" 2>&1
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Verify at:" -ForegroundColor Yellow
Write-Host "  https://tomo-sa.com" -ForegroundColor White
Write-Host "  https://tomo-sa.com/admin" -ForegroundColor White
Write-Host "  https://tomo-sa.com/admin/marketing" -ForegroundColor White
Write-Host ""

