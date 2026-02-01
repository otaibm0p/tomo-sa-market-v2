# سكريبت سريع لنقل التحديثات إلى tomo-sa.com
# قم بتشغيل هذا السكريبت من مجلد المشروع الرئيسي

$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-market"

Write-Host "🚀 بدء نقل التحديثات إلى tomo-sa.com..." -ForegroundColor Green
Write-Host ""

# 1. رفع Frontend
Write-Host "📤 رفع ملفات Frontend..." -ForegroundColor Yellow
Set-Location frontend/dist
Get-ChildItem -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
    if (-not $_.PSIsContainer) {
        $remotePath = "${REMOTE_DIR}/frontend/dist/$relativePath"
        scp $_.FullName "${SERVER}:$remotePath"
    }
}
Set-Location ..\..
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم رفع Frontend بنجاح!" -ForegroundColor Green
} else {
    Write-Host "⚠️  قد تحتاج إلى إدخال كلمة مرور SSH" -ForegroundColor Yellow
}
Write-Host ""

# 2. رفع Backend
Write-Host "📤 رفع ملفات Backend..." -ForegroundColor Yellow
scp backend/server.js "${SERVER}:${REMOTE_DIR}/backend/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم رفع Backend بنجاح!" -ForegroundColor Green
} else {
    Write-Host "⚠️  قد تحتاج إلى إدخال كلمة مرور SSH" -ForegroundColor Yellow
}
Write-Host ""

# 2.5. رفع ملفات الإعدادات
Write-Host "📤 رفع ملفات الإعدادات..." -ForegroundColor Yellow
scp nginx.conf "${SERVER}:/etc/nginx/sites-available/tomo-sa.com"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم رفع nginx.conf بنجاح!" -ForegroundColor Green
} else {
    Write-Host "⚠️  قد تحتاج إلى إدخال كلمة مرور SSH" -ForegroundColor Yellow
}

scp ecosystem.config.js "${SERVER}:${REMOTE_DIR}/"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم رفع ecosystem.config.js بنجاح!" -ForegroundColor Green
} else {
    Write-Host "⚠️  قد تحتاج إلى إدخال كلمة مرور SSH" -ForegroundColor Yellow
}
Write-Host ""

# 3. إعادة تشغيل PM2
Write-Host "🔄 إعادة تشغيل الخدمات..." -ForegroundColor Yellow
ssh $SERVER "cd $REMOTE_DIR && pm2 restart tomo-market-backend && pm2 save"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم إعادة تشغيل PM2 بنجاح!" -ForegroundColor Green
} else {
    Write-Host "⚠️  قد تكون هناك مشكلة في PM2. تحقق يدوياً." -ForegroundColor Yellow
}
Write-Host ""

# 4. إعادة تحميل Nginx
Write-Host "🔄 إعادة تحميل Nginx..." -ForegroundColor Yellow
ssh $SERVER "nginx -t && systemctl reload nginx"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ تم إعادة تحميل Nginx بنجاح!" -ForegroundColor Green
} else {
    Write-Host "⚠️  قد تكون هناك مشكلة في Nginx. تحقق يدوياً." -ForegroundColor Yellow
}
Write-Host ""

# 5. عرض حالة PM2
Write-Host "📋 حالة PM2:" -ForegroundColor Cyan
ssh $SERVER "pm2 status"
Write-Host ""

Write-Host "✅ تم نقل التحديثات بنجاح!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 تحقق من الموقع:" -ForegroundColor Cyan
Write-Host "   https://tomo-sa.com" -ForegroundColor White
Write-Host "   https://tomo-sa.com/admin" -ForegroundColor White
Write-Host "   https://tomo-sa.com/admin/marketing" -ForegroundColor White
Write-Host ""

