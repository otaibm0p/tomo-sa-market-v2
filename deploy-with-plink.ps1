# Deployment using PuTTY's plink (if available) or standard SSH
# This script will attempt to use plink for password automation

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-market"

# Check for plink
$plinkPath = Get-Command plink -ErrorAction SilentlyContinue
if (-not $plinkPath) {
    # Try common PuTTY installation paths
    $puttyPaths = @(
        "${env:ProgramFiles}\PuTTY\plink.exe",
        "${env:ProgramFiles(x86)}\PuTTY\plink.exe",
        "$env:LOCALAPPDATA\Programs\PuTTY\plink.exe"
    )
    
    foreach ($path in $puttyPaths) {
        if (Test-Path $path) {
            $plinkPath = $path
            break
        }
    }
}

Write-Host "Starting deployment..." -ForegroundColor Green
Write-Host ""

if ($plinkPath) {
    Write-Host "Found PuTTY plink at: $plinkPath" -ForegroundColor Cyan
    Write-Host "You will be asked for SSH password once." -ForegroundColor Yellow
    Write-Host ""
    
    # Step 1: Upload Frontend
    Write-Host "[1/4] Uploading Frontend..." -ForegroundColor Yellow
    Set-Location frontend\dist
    & $plinkPath -ssh -pw (Read-Host "Enter SSH password" -AsSecureString | ConvertFrom-SecureString) $SERVER "mkdir -p ${REMOTE_DIR}/frontend/dist" 2>&1 | Out-Null
    Get-ChildItem -Recurse -File | ForEach-Object {
        $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
        $remotePath = "${REMOTE_DIR}/frontend/dist/$relativePath"
        Write-Host "  Uploading: $relativePath" -ForegroundColor Gray
        # Use pscp for file transfer
        $pscpPath = $plinkPath -replace "plink.exe", "pscp.exe"
        if (Test-Path $pscpPath) {
            & $pscpPath -pw (Read-Host "Enter SSH password" -AsSecureString | ConvertFrom-SecureString) $_.FullName "${SERVER}:$remotePath" 2>&1 | Out-Null
        }
    }
    Set-Location ..\..

    # Step 2: Upload Backend
    Write-Host "[2/4] Uploading Backend..." -ForegroundColor Yellow
    $pscpPath = $plinkPath -replace "plink.exe", "pscp.exe"
    if (Test-Path $pscpPath) {
        & $pscpPath -pw (Read-Host "Enter SSH password" -AsSecureString | ConvertFrom-SecureString) backend\server.js "${SERVER}:${REMOTE_DIR}/backend/" 2>&1 | Out-Null
    }

    # Step 3: Upload Config Files
    Write-Host "[3/4] Uploading Config Files..." -ForegroundColor Yellow
    if (Test-Path $pscpPath) {
        & $pscpPath -pw (Read-Host "Enter SSH password" -AsSecureString | ConvertFrom-SecureString) nginx.conf "${SERVER}:/etc/nginx/sites-available/tomo-sa.com" 2>&1 | Out-Null
        & $pscpPath -pw (Read-Host "Enter SSH password" -AsSecureString | ConvertFrom-SecureString) ecosystem.config.js "${SERVER}:${REMOTE_DIR}/" 2>&1 | Out-Null
    }

    # Step 4: Restart Services
    Write-Host "[4/4] Restarting Services..." -ForegroundColor Yellow
    $password = Read-Host "Enter SSH password" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    & $plinkPath -ssh -pw $PlainPassword $SERVER "cd $REMOTE_DIR && pm2 restart tomo-market-backend && pm2 save" 2>&1
    & $plinkPath -ssh -pw $PlainPassword $SERVER "nginx -t && systemctl reload nginx" 2>&1
    
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
} else {
    Write-Host "PuTTY plink not found. Using standard SSH." -ForegroundColor Yellow
    Write-Host "You will need to enter password for each command." -ForegroundColor Yellow
    Write-Host ""
    
    # Fallback to standard method
    Write-Host "[1/4] Uploading Frontend..." -ForegroundColor Yellow
    Set-Location frontend\dist
    scp -r * "${SERVER}:${REMOTE_DIR}/frontend/dist/"
    Set-Location ..\..

    Write-Host "[2/4] Uploading Backend..." -ForegroundColor Yellow
    scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"

    Write-Host "[3/4] Uploading Config Files..." -ForegroundColor Yellow
    scp nginx.conf "${SERVER}:/etc/nginx/sites-available/tomo-sa.com"
    scp ecosystem.config.js "${SERVER}:${REMOTE_DIR}/"

    Write-Host "[4/4] Restarting Services..." -ForegroundColor Yellow
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

