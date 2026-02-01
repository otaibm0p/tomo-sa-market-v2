# إعادة بناء Frontend - TOMO Market
Write-Host "🔨 إعادة بناء Frontend..." -ForegroundColor Green
Write-Host ""

# الانتقال إلى مجلد frontend
Set-Location frontend

# التحقق من وجود node_modules
if (!(Test-Path "node_modules")) {
    Write-Host "📦 تثبيت المكتبات..." -ForegroundColor Yellow
    npm install
}

# إعادة بناء Frontend
Write-Host "🔨 جاري بناء Frontend..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ تم بناء Frontend بنجاح!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📂 الملفات المبنية موجودة في: frontend/dist" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📤 لرفع الملفات إلى السيرفر، استخدم:" -ForegroundColor Yellow
    Write-Host "   scp -r frontend/dist/* root@138.68.245.29:/var/www/tomo-market/backend/public/"
    Write-Host ""
} 
else {
    Write-Host ""
    Write-Host "❌ فشل بناء Frontend!" -ForegroundColor Red
    Write-Host "   تحقق من الأخطاء أعلاه" -ForegroundColor Yellow
}

# العودة إلى المجلد الرئيسي
Set-Location ..

