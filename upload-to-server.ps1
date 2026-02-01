# رفع الملفات المبنية إلى السيرفر
Write-Host "📤 رفع ملفات Frontend المبنية إلى السيرفر..." -ForegroundColor Green
Write-Host ""

$serverIP = "138.68.245.29"
$remotePath = "/var/www/tomo-market/backend/public"
$localPath = "frontend/dist"

if (!(Test-Path $localPath)) {
    Write-Host "❌ مجلد $localPath غير موجود!" -ForegroundColor Red
    Write-Host "   يرجى بناء Frontend أولاً: npm run build" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔐 جاري رفع الملفات إلى $serverIP" -ForegroundColor Cyan
Write-Host "⚠️  ستُطلب منك إدخال كلمة مرور root" -ForegroundColor Yellow
Write-Host ""

# رفع الملفات
$uploadCommand = "scp -r $localPath/* root@${serverIP}:${remotePath}/"

try {
    Invoke-Expression $uploadCommand
    Write-Host ""
    Write-Host "✅ تم رفع الملفات بنجاح!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 جاري إعادة تحميل Nginx..." -ForegroundColor Cyan
    
    # إعادة تحميل Nginx
    $reloadCommand = "ssh root@${serverIP} 'systemctl reload nginx'"
    Invoke-Expression $reloadCommand
    
    Write-Host ""
    Write-Host "✅ تم الانتهاء!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 اختبر الموقع على: https://tomo-sa.com" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "💡 نصيحة: امسح كاش المتصفح (Ctrl + Shift + R) لرؤية التحديثات" -ForegroundColor Yellow
}
catch {
    Write-Host ""
    Write-Host "❌ حدث خطأ أثناء رفع الملفات" -ForegroundColor Red
    Write-Host "   الخطأ: $_" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 يمكنك رفع الملفات يدوياً باستخدام FileZilla أو SCP" -ForegroundColor Cyan
}

