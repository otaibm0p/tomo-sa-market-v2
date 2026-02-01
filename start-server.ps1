# تشغيل الخادم على السيرفر - TOMO Market
# هذا الملف يساعدك في الاتصال بالسيرفر وتشغيل الخادم

Write-Host "🚀 تشغيل خادم TOMO Market على السيرفر" -ForegroundColor Green
Write-Host ""

# معلومات الاتصال
$serverIP = "138.68.245.29"  # قم بتغيير هذا إلى IP سيرفرك
$serverDomain = "tomo-sa.com"  # أو استخدم الدومين

Write-Host "📋 اختر طريقة الاتصال:" -ForegroundColor Yellow
Write-Host "1. الاتصال عبر IP: $serverIP"
Write-Host "2. الاتصال عبر الدومين: $serverDomain"
Write-Host ""

$choice = Read-Host "اختر (1 أو 2)"

if ($choice -eq "1") {
    $serverAddress = $serverIP
} else {
    $serverAddress = $serverDomain
}

Write-Host ""
Write-Host "🔐 جاري الاتصال بالسيرفر: $serverAddress" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  ستُطلب منك إدخال كلمة مرور root" -ForegroundColor Yellow
Write-Host ""

# الأوامر التي سيتم تنفيذها على السيرفر
$commands = @"
cd /var/www/tomo-market
echo '📂 تم الانتقال إلى مجلد المشروع'

echo ''
echo '🔍 التحقق من حالة PostgreSQL...'
systemctl status postgresql --no-pager -l | head -10

echo ''
echo '🔄 إعادة تشغيل PostgreSQL...'
sudo systemctl restart postgresql

echo ''
echo '🔍 التحقق من حالة PM2...'
pm2 status

echo ''
echo '🔄 إعادة تشغيل/تشغيل الخادم...'
(pm2 restart tomo-market-backend 2>/dev/null) || (pm2 start ecosystem.config.js 2>/dev/null) || (pm2 start backend/server.js --name tomo-market-backend)

echo ''
echo '💾 حفظ إعدادات PM2...'
pm2 save

echo ''
echo '✅ التحقق من الحالة النهائية...'
pm2 status

echo ''
echo '📋 آخر 20 سطر من السجلات:'
pm2 logs tomo-market-backend --lines 20 --nostream

echo ''
echo '🎉 تم الانتهاء!'
"@

# تنفيذ الأوامر عبر SSH
Write-Host "⏳ جاري تنفيذ الأوامر على السيرفر..." -ForegroundColor Cyan
Write-Host ""

ssh root@$serverAddress $commands

Write-Host ""
Write-Host "✅ انتهى التنفيذ!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 لمراقبة السجلات، استخدم:" -ForegroundColor Yellow
Write-Host "   ssh root@$serverAddress 'pm2 logs tomo-market-backend'"
Write-Host ""
Write-Host "🌐 اختبر الموقع على:" -ForegroundColor Cyan
Write-Host "   https://tomo-sa.com"
Write-Host ('   http://' + $serverIP)
Write-Host ""
