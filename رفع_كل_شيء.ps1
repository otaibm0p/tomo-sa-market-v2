# رفع جميع التحديثات إلى tomo-sa.com
# Frontend + Backend + Build + Restart

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-app"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  رفع جميع التحديثات إلى tomo-sa.com" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# الخطوة 1: رفع Frontend
Write-Host "[1/5] رفع ملفات Frontend..." -ForegroundColor Yellow
Set-Location frontend\src
Write-Host "   رفع frontend/src/* إلى السيرفر..." -ForegroundColor Gray
scp -r * "${SERVER}:${REMOTE_DIR}/frontend/src/"
Set-Location ..\..

# الخطوة 2: رفع Backend
Write-Host "[2/5] رفع ملف Backend..." -ForegroundColor Yellow
Write-Host "   رفع backend/server.js..." -ForegroundColor Gray
scp backend\server.js "${SERVER}:${REMOTE_DIR}/backend/"

# الخطوة 3: بناء المشروع
Write-Host "[3/5] بناء المشروع على السيرفر..." -ForegroundColor Yellow
Write-Host "   npm install && npm run build..." -ForegroundColor Gray
ssh $SERVER "cd ${REMOTE_DIR}/frontend && npm install && npm run build"

# الخطوة 4: إعادة تشغيل PM2
Write-Host "[4/5] إعادة تشغيل Backend..." -ForegroundColor Yellow
Write-Host "   pm2 restart tomo-backend..." -ForegroundColor Gray
ssh $SERVER "pm2 restart tomo-backend && pm2 save"

# الخطوة 5: التحقق
Write-Host "[5/5] التحقق من الحالة..." -ForegroundColor Yellow
ssh $SERVER "pm2 status tomo-backend"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  تم النقل بنجاح!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "تحقق من:" -ForegroundColor Yellow
Write-Host "  https://tomo-sa.com" -ForegroundColor White
Write-Host "  https://tomo-sa.com/admin" -ForegroundColor White
Write-Host "  https://tomo-sa.com/admin/marketing" -ForegroundColor White
Write-Host ""

