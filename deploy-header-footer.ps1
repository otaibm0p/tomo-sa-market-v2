# Deploy Header and Footer with White Background
$server = "root@138.68.245.29"
$remotePath = "/var/www/tomo-app/frontend"

Write-Host "📤 Uploading Header.tsx..." -ForegroundColor Cyan
scp frontend\src\components\Header.tsx "${server}:${remotePath}/src/components/Header.tsx"

Write-Host "📤 Uploading Footer.tsx..." -ForegroundColor Cyan
scp frontend\src\components\Footer.tsx "${server}:${remotePath}/src/components/Footer.tsx"

Write-Host "🔨 Building Frontend on server..." -ForegroundColor Cyan
ssh $server "cd $remotePath; npm run build 2>&1 | tail -5"

Write-Host "🔧 Fixing permissions..." -ForegroundColor Cyan
ssh $server "chmod -R 755 ${remotePath}/dist && chown -R www-data:www-data ${remotePath}/dist && systemctl reload nginx"

Write-Host "✅ Done! Header and Footer are now white." -ForegroundColor Green

