# نسخة بسيطة - رفع فقط (بدون build تلقائي)
# شغل هذا ثم افتح PuTTY للبناء

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-app"

Write-Host "رفع التحديثات..." -ForegroundColor Green
Write-Host ""

# رفع Frontend
Write-Host "رفع Frontend..." -ForegroundColor Yellow
Set-Location frontend\src
scp -r * "${SERVER}:${REMOTE_DIR}/frontend/src/"
Set-Location ..\..

# رفع Backend
Write-Host "رفع Backend..." -ForegroundColor Yellow
scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"

Write-Host ""
Write-Host "تم الرفع!" -ForegroundColor Green
Write-Host ""
Write-Host "الآن افتح PuTTY واكتب:" -ForegroundColor Cyan
Write-Host "  cd /var/www/tomo-app/frontend" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  pm2 restart tomo-backend" -ForegroundColor White
Write-Host "  pm2 save" -ForegroundColor White
Write-Host ""

