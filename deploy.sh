#!/bin/bash

# TOMO Market Deployment Script
# Run this script on your DigitalOcean Droplet

set -e  # Exit on error

echo "🚀 Starting TOMO Market Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root${NC}"
    exit 1
fi

# Variables
PROJECT_DIR="/var/www/tomo-market"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

echo -e "${GREEN}✅ Running as root${NC}"

# Step 1: Update system
echo -e "${YELLOW}📦 Updating system...${NC}"
apt update && apt upgrade -y

# Step 2: Install Node.js if not installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
fi

# Step 3: Install PostgreSQL if not installed
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PostgreSQL...${NC}"
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Step 4: Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Nginx...${NC}"
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
fi

# Step 5: Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📦 Installing PM2...${NC}"
    npm install -g pm2
fi

# Step 6: Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Certbot...${NC}"
    apt install -y certbot python3-certbot-nginx
fi

# Step 7: Create project directory
echo -e "${YELLOW}📁 Creating project directory...${NC}"
mkdir -p $PROJECT_DIR

# Step 8: Install backend dependencies
if [ -d "$BACKEND_DIR" ]; then
    echo -e "${YELLOW}📦 Installing backend dependencies...${NC}"
    cd $BACKEND_DIR
    npm install --production
fi

# Step 9: Build frontend
if [ -d "$FRONTEND_DIR" ]; then
    echo -e "${YELLOW}🏗️  Building frontend...${NC}"
    cd $FRONTEND_DIR
    npm install
    npm run build
fi

# Step 10: Setup PM2
if [ -f "$PROJECT_DIR/ecosystem.config.js" ]; then
    echo -e "${YELLOW}⚙️  Setting up PM2...${NC}"
    cd $PROJECT_DIR
    pm2 delete tomo-market-backend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
fi

# Step 11: Setup Nginx
if [ -f "/etc/nginx/sites-available/tomo-sa.com" ]; then
    echo -e "${YELLOW}⚙️  Setting up Nginx...${NC}"
    ln -sf /etc/nginx/sites-available/tomo-sa.com /etc/nginx/sites-enabled/
    rm -f /etc/nginx/sites-enabled/default
    nginx -t
    systemctl reload nginx
fi

# Step 12: Setup Firewall
echo -e "${YELLOW}🔥 Setting up firewall...${NC}"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo -e "${GREEN}✅ Deployment completed!${NC}"
echo -e "${YELLOW}📋 Next steps:${NC}"
echo "1. Setup database: sudo -u postgres psql"
echo "2. Create .env file in $BACKEND_DIR"
echo "3. Setup DNS in Hostinger"
echo "4. Run: certbot --nginx -d tomo-sa.com -d www.tomo-sa.com"
echo "5. Check status: pm2 status"

