# Simple deployment script - asks for password once per command group
# Deploy to /var/www/tomo-app

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-app"

Write-Host "Deploying to /var/www/tomo-app" -ForegroundColor Green
Write-Host "You will be asked for SSH password multiple times" -ForegroundColor Yellow
Write-Host ""

# Step 1: Upload frontend/src
Write-Host "[1/6] Uploading frontend/src..." -ForegroundColor Yellow
Set-Location frontend\src
scp -r * "${SERVER}:${REMOTE_DIR}/frontend/src/"
Set-Location ..\..

# Step 2: List changes
Write-Host "[2/6] Checking changes..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR && find frontend/src -type f | head -20"

# Step 3: Install & Build
Write-Host "[3/6] Installing dependencies..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR/frontend && npm install"

Write-Host "[4/6] Building production..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR/frontend && npm run build"

# Step 5: Restart
Write-Host "[5/6] Restarting backend..." -ForegroundColor Yellow
ssh $SERVER "pm2 restart tomo-backend && pm2 save"

# Step 6: Verify
Write-Host "[6/6] Verifying..." -ForegroundColor Yellow
ssh $SERVER "stat ${REMOTE_DIR}/frontend/dist/index.html && pm2 status tomo-backend"

Write-Host ""
Write-Host "Done! Check https://tomo-sa.com" -ForegroundColor Green

