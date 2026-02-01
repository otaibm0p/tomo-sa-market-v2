# Simple script to start the server
$SERVER = "138.68.245.29"
$USER = "root"

Write-Host "Starting TOMO Market Backend on Server..." -ForegroundColor Green

# Start/Restart the application
ssh ${USER}@${SERVER} "cd /var/www/tomo-app && pm2 restart tomo-market-backend || pm2 restart tomo-backend || pm2 start ecosystem.config.js || (cd backend && pm2 start server.js --name tomo-market-backend)"

# Check status
Write-Host "`nApplication Status:" -ForegroundColor Cyan
ssh ${USER}@${SERVER} "pm2 status"

Write-Host "`nDone!" -ForegroundColor Green
