# أسهل طريقة - رفع جميع الملفات دفعة واحدة
# شغل هذا الملف وادخل كلمة المرور عند الطلب

$SERVER = "root@138.68.245.29"

Write-Host "رفع جميع ملفات frontend/src..." -ForegroundColor Green
Write-Host "سيطلب منك كلمة المرور مرة واحدة" -ForegroundColor Yellow
Write-Host ""

# رفع كل ملفات frontend/src
Set-Location frontend\src
scp -r * "${SERVER}:/var/www/tomo-app/frontend/src/"
Set-Location ..\..

Write-Host ""
Write-Host "تم الرفع!" -ForegroundColor Green
Write-Host ""
Write-Host "الآن افتح PuTTY واكتب:" -ForegroundColor Cyan
Write-Host "  cd /var/www/tomo-app/frontend" -ForegroundColor White
Write-Host "  npm install" -ForegroundColor White
Write-Host "  npm run build" -ForegroundColor White
Write-Host "  pm2 restart tomo-backend" -ForegroundColor White
Write-Host ""

