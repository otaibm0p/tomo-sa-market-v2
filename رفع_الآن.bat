@echo off
chcp 65001 >nul
echo ========================================
echo   رفع التحديثات إلى tomo-sa.com
echo ========================================
echo.
echo سيطلب منك كلمة مرور SSH مرتين
echo أدخل كلمة المرور عند كل طلب
echo.
pause

echo.
echo [1/2] رفع ملفات Frontend...
echo.
cd frontend\src
scp -r * root@138.68.245.29:/var/www/tomo-app/frontend/src/
cd ..\..

echo.
echo [2/2] رفع ملف Backend...
echo.
scp backend\server.js root@138.68.245.29:/var/www/tomo-app/backend/

echo.
echo ========================================
echo   تم الرفع بنجاح!
echo ========================================
echo.
echo الآن افتح PuTTY واكتب:
echo   cd /var/www/tomo-app/frontend
echo   npm install
echo   npm run build
echo   pm2 restart tomo-backend
echo   pm2 save
echo.
pause

