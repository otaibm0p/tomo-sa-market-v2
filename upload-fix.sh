#!/bin/bash
# رفع ملفات Frontend المحدثة إلى السيرفر

SERVER="root@138.68.245.29"
TARGET_DIR="/var/www/tomo-market/backend/public"
SOURCE_DIR="frontend/dist"

echo "🚀 رفع الملفات المحدثة إلى السيرفر..."
echo ""

# رفع الملفات
cd "$SOURCE_DIR" || exit 1
tar -czf - . | ssh "$SERVER" "cd $TARGET_DIR && tar -xzf - && chmod -R 755 . && echo '✅ تم رفع الملفات بنجاح'"

echo ""
echo "🔄 إعادة تحميل Nginx..."
ssh "$SERVER" "systemctl reload nginx && echo '✅ تم إعادة تحميل Nginx'"

echo ""
echo "✅ تم الانتهاء!"
echo "🌐 اختبر الموقع: https://tomo-sa.com"

