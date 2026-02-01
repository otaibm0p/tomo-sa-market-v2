@echo off
echo.
echo ========================================
echo   Uploading files to server...
echo ========================================
echo.
echo You will be asked for SSH password.
echo Enter your password when prompted.
echo.
pause

cd frontend\src
scp -r * root@138.68.245.29:/var/www/tomo-app/frontend/src/
cd ..\..

scp backend\server.js root@138.68.245.29:/var/www/tomo-app/backend/

echo.
echo ========================================
echo   Upload complete!
echo ========================================
echo.
echo Now open PuTTY and connect to: root@138.68.245.29
echo Then copy and paste these commands:
echo.
echo cd /var/www/tomo-app/frontend
echo npm install
echo npm run build
echo pm2 restart tomo-backend
echo pm2 save
echo.
pause

