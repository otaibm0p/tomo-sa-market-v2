# رفع وإصلاح المشكلة تلقائياً - TOMO Market
Write-Host "🚀 بدء رفع وإصلاح المشكلة..." -ForegroundColor Green
Write-Host ""

$serverIP = "138.68.245.29"
$serverDomain = "tomo-sa.com"

# 1. التأكد من بناء Frontend
Write-Host "🔨 التحقق من بناء Frontend..." -ForegroundColor Cyan
if (!(Test-Path "frontend/dist/index.html")) {
    Write-Host "📦 بناء Frontend..." -ForegroundColor Yellow
    Set-Location frontend
    npm run build
    Set-Location ..
}

# 2. رفع الملفات
Write-Host ""
Write-Host "📤 رفع الملفات إلى السيرفر..." -ForegroundColor Cyan
Write-Host "⚠️  سيُطلب منك إدخال كلمة مرور root" -ForegroundColor Yellow
Write-Host ""

# رفع الملفات
$uploadCommand = "cd frontend/dist && tar -czf - * | ssh root@$serverIP 'cd /var/www/tomo-market/backend/public && tar -xzf -'"
Invoke-Expression $uploadCommand

# 3. إعادة تحميل Nginx على السيرفر
Write-Host ""
Write-Host "🔄 إعادة تحميل Nginx..." -ForegroundColor Cyan
ssh root@$serverIP "systemctl reload nginx && echo '✅ تم إعادة تحميل Nginx بنجاح'"

Write-Host ""
Write-Host "✅ تم الانتهاء!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 اختبر الموقع الآن:" -ForegroundColor Cyan
Write-Host "   https://tomo-sa.com"
Write-Host "   http://$serverIP"
Write-Host ""
Write-Host "💡 نصيحة: اضغط Ctrl + Shift + R لإعادة تحميل الصفحة بدون كاش" -ForegroundColor Yellow
Write-Host ""

