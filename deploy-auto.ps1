# Auto Deployment Script with Password Input
# This script will ask for SSH password once and use it for all operations

param(
    [SecureString]$SSHPassword
)

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-market"

# If password not provided, ask for it
if (-not $SSHPassword) {
    Write-Host "Enter SSH password for root@138.68.245.29:" -ForegroundColor Yellow
    $SSHPassword = Read-Host -AsSecureString
}

# Convert SecureString to plain text (for sshpass if available)
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SSHPassword)
$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host "Starting deployment..." -ForegroundColor Green
Write-Host ""

# Check if sshpass is available (Linux/WSL)
$sshpassAvailable = Get-Command sshpass -ErrorAction SilentlyContinue

if ($sshpassAvailable) {
    Write-Host "Using sshpass for password authentication" -ForegroundColor Cyan
    
    # Step 1: Upload Frontend
    Write-Host "[1/4] Uploading Frontend..." -ForegroundColor Yellow
    Set-Location frontend\dist
    $env:SSHPASS = $PlainPassword
    sshpass -e scp -r * "${SERVER}:${REMOTE_DIR}/frontend/dist/"
    Set-Location ..\..

    # Step 2: Upload Backend
    Write-Host "[2/4] Uploading Backend..." -ForegroundColor Yellow
    sshpass -e scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"

    # Step 3: Upload Config Files
    Write-Host "[3/4] Uploading Config Files..." -ForegroundColor Yellow
    sshpass -e scp nginx.conf "${SERVER}:/etc/nginx/sites-available/tomo-sa.com"
    sshpass -e scp ecosystem.config.js "${SERVER}:${REMOTE_DIR}/"

    # Step 4: Restart Services
    Write-Host "[4/4] Restarting Services..." -ForegroundColor Yellow
    sshpass -e ssh $SERVER "cd $REMOTE_DIR && pm2 restart tomo-market-backend && pm2 save"
    sshpass -e ssh $SERVER "nginx -t && systemctl reload nginx"
    
    Remove-Item Env:\SSHPASS
} else {
    Write-Host "sshpass not available. Using manual method." -ForegroundColor Yellow
    Write-Host "You will need to enter password for each command." -ForegroundColor Yellow
    Write-Host ""
    
    # Step 1: Upload Frontend
    Write-Host "[1/4] Uploading Frontend..." -ForegroundColor Yellow
    Write-Host "Enter SSH password when prompted:" -ForegroundColor Cyan
    Set-Location frontend\dist
    scp -r * "${SERVER}:${REMOTE_DIR}/frontend/dist/"
    Set-Location ..\..

    # Step 2: Upload Backend
    Write-Host "[2/4] Uploading Backend..." -ForegroundColor Yellow
    Write-Host "Enter SSH password when prompted:" -ForegroundColor Cyan
    scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"

    # Step 3: Upload Config Files
    Write-Host "[3/4] Uploading Config Files..." -ForegroundColor Yellow
    Write-Host "Enter SSH password when prompted:" -ForegroundColor Cyan
    scp nginx.conf "${SERVER}:/etc/nginx/sites-available/tomo-sa.com"
    scp ecosystem.config.js "${SERVER}:${REMOTE_DIR}/"

    # Step 4: Restart Services
    Write-Host "[4/4] Restarting Services..." -ForegroundColor Yellow
    Write-Host "Enter SSH password when prompted:" -ForegroundColor Cyan
    ssh $SERVER "cd $REMOTE_DIR && pm2 restart tomo-market-backend && pm2 save"
    ssh $SERVER "nginx -t && systemctl reload nginx"
}

Write-Host ""
Write-Host "Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Check:" -ForegroundColor Cyan
Write-Host "  https://tomo-sa.com" -ForegroundColor White
Write-Host "  https://tomo-sa.com/admin" -ForegroundColor White
Write-Host "  https://tomo-sa.com/admin/marketing" -ForegroundColor White
Write-Host ""

