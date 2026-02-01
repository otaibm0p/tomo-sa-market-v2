# رفع مجلد uploads إلى السيرفر
$SERVER = "root@138.68.245.29"
$REMOTE_DIR = "/var/www/tomo-app"

Write-Host "رفع مجلد uploads..." -ForegroundColor Green
Write-Host "سيطلب منك كلمة مرور SSH - أدخلها" -ForegroundColor Yellow
Write-Host ""

# إنشاء المجلدات على السيرفر
ssh $SERVER "mkdir -p ${REMOTE_DIR}/uploads/products ${REMOTE_DIR}/uploads/content ${REMOTE_DIR}/uploads/drivers"

# رفع محتوى uploads
if (Test-Path "backend\uploads\products") {
    Write-Host "رفع صور المنتجات..." -ForegroundColor Cyan
    scp -r backend\uploads\products\* "${SERVER}:${REMOTE_DIR}/uploads/products/"
}

if (Test-Path "backend\uploads\content") {
    Write-Host "رفع محتوى الصور..." -ForegroundColor Cyan
    scp -r backend\uploads\content\* "${SERVER}:${REMOTE_DIR}/uploads/content/"
}

Write-Host ""
Write-Host "تم الرفع!" -ForegroundColor Green
Write-Host ""
Write-Host "ملاحظة: إذا كانت المجلدات فارغة محلياً،" -ForegroundColor Yellow
Write-Host "فالصور قد تكون مخزنة كـ URLs في قاعدة البيانات" -ForegroundColor Yellow
Write-Host ""

