# ⚡ دليل النشر السريع - TOMO Market

## 🎯 الخطوات السريعة (Quick Start)

### 1️⃣ على DigitalOcean
```bash
# إنشاء Droplet جديد (Ubuntu 22.04)
# نسخ IP Address
```

### 2️⃣ الاتصال بالخادم
```bash
ssh root@YOUR_DROPLET_IP
```

### 3️⃣ تشغيل سكريبت النشر
```bash
# رفع ملف deploy.sh إلى الخادم
chmod +x deploy.sh
./deploy.sh
```

### 4️⃣ إعداد قاعدة البيانات
```bash
sudo -u postgres psql
```

في PostgreSQL:
```sql
CREATE DATABASE tomomarket;
CREATE USER tomouser WITH PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE tomomarket TO tomouser;
ALTER USER tomouser CREATEDB;
\q
```

### 5️⃣ رفع الملفات
```bash
# من جهازك المحلي (PowerShell):
scp -r C:\Users\Dell\Desktop\tomo-market-v2\* root@YOUR_DROPLET_IP:/var/www/tomo-market/
```

### 6️⃣ إعداد Backend
```bash
cd /var/www/tomo-market/backend
nano .env
```

أضف:
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=YOUR_STRONG_SECRET
DATABASE_URL=postgresql://tomouser:YOUR_PASSWORD@localhost:5432/tomomarket
DOMAIN=tomo-sa.com
```

### 7️⃣ بناء Frontend
```bash
cd /var/www/tomo-market/frontend
npm install
npm run build
```

### 8️⃣ إعداد Nginx
```bash
# رفع ملف nginx.conf إلى الخادم
cp nginx.conf /etc/nginx/sites-available/tomo-sa.com
ln -s /etc/nginx/sites-available/tomo-sa.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### 9️⃣ إعداد PM2
```bash
cd /var/www/tomo-market
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 🔟 إعداد DNS في Hostinger
- اذهب إلى hPanel → DNS
- أضف A Record:
  - Name: `@`
  - Value: `YOUR_DROPLET_IP`
- أضف A Record:
  - Name: `www`
  - Value: `YOUR_DROPLET_IP`

### 1️⃣1️⃣ إعداد SSL
```bash
certbot --nginx -d tomo-sa.com -d www.tomo-sa.com
```

### ✅ جاهز!
افتح: `https://tomo-sa.com`

---

## 🔍 التحقق من الحالة

```bash
# PM2
pm2 status
pm2 logs

# Nginx
systemctl status nginx
nginx -t

# Database
systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"
```

---

## 🐛 حل المشاكل

### الموقع لا يعمل
```bash
pm2 logs
tail -f /var/log/nginx/error.log
```

### قاعدة البيانات لا تتصل
```bash
psql -U tomouser -d tomomarket -h localhost
```

### SSL لا يعمل
```bash
certbot renew --force-renewal
systemctl reload nginx
```

