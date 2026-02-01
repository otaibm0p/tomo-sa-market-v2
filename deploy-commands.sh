#!/bin/bash
# Commands to run on the server after uploading files via FileZilla
# Copy and paste these commands one by one in PuTTY/SSH

SERVER_DIR="/var/www/tomo-app"

echo "=========================================="
echo "Step 1: List changed files"
echo "=========================================="
cd $SERVER_DIR
find frontend/src -type f | head -20

echo ""
echo "=========================================="
echo "Step 2: Install dependencies"
echo "=========================================="
cd $SERVER_DIR/frontend
npm install

echo ""
echo "=========================================="
echo "Step 3: Build production"
echo "=========================================="
npm run build

echo ""
echo "=========================================="
echo "Step 4: Verify dist was updated"
echo "=========================================="
stat frontend/dist/index.html

echo ""
echo "=========================================="
echo "Step 5: Restart backend"
echo "=========================================="
pm2 restart tomo-backend
pm2 save

echo ""
echo "=========================================="
echo "Step 6: Check PM2 status"
echo "=========================================="
pm2 status tomo-backend

echo ""
echo "=========================================="
echo "Step 7: Check backend logs"
echo "=========================================="
pm2 logs tomo-backend --lines 20 --nostream

echo ""
echo "=========================================="
echo "Done! Check https://tomo-sa.com"
echo "=========================================="

