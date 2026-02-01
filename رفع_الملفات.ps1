# رفع الملفات إلى السيرفر
# افتح هذا الملف في PowerShell واتبع التعليمات

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  رفع التحديثات إلى tomo-sa.com" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# الخطوة 1: رفع Frontend
Write-Host "[1/2] رفع ملفات Frontend..." -ForegroundColor Yellow
Write-Host "سيطلب منك كلمة مرور SSH - أدخلها الآن" -ForegroundColor Cyan
Write-Host ""

Set-Location frontend\src
scp -r * "${SERVER}:${REMOTE_DIR}/frontend/src/"
Set-Location ..\..

Write-Host ""
Write-Host "تم رفع Frontend!" -ForegroundColor Green
Write-Host ""

# الخطوة 2: رفع Backend
Write-Host "[2/2] رفع ملف Backend..." -ForegroundColor Yellow
Write-Host "سيطلب منك كلمة مرور SSH مرة أخرى - أدخلها" -ForegroundColor Cyan
Write-Host ""

scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  تم الرفع بنجاح!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "الآن افتح PuTTY واكتب:" -ForegroundColor Yellow
Write-Host "  cd /var/www/tomo-app/frontend" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  pm2 restart tomo-backend" -ForegroundColor White
Write-Host "  pm2 save" -ForegroundColor White
Write-Host ""
Write-Host "اضغط أي زر للخروج..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

