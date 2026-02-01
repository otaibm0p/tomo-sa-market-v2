# 🚀 ابدأ من هنا - نشر TOMO Market على DigitalOcean

## 📋 الملفات المتوفرة

تم إنشاء الملفات التالية لمساعدتك في النشر:

1. **README_DEPLOY.md** - نظرة عامة سريعة
2. **DEPLOYMENT_GUIDE.md** - دليل شامل ومفصل (اقرأه أولاً!)
3. **QUICK_DEPLOY.md** - خطوات سريعة
4. **TROUBLESHOOTING.md** - حل المشاكل الشائعة
5. **nginx.conf** - إعدادات Nginx
6. **ecosystem.config.js** - إعدادات PM2
7. **deploy.sh** - سكريبت تلقائي
8. **backend/env.template** - قالب ملف البيئة

---

## 🎯 الخطوات الأساسية (ملخص)

### 1️⃣ على DigitalOcean
- أنشئ Droplet جديد (Ubuntu 22.04)
- سجّل IP Address

### 2️⃣ على الخادم
```bash
ssh root@YOUR_DROPLET_IP
```

### 3️⃣ رفع الملفات
```powershell
# من Windows PowerShell
scp -r C:\Users\Dell\Desktop\tomo-market-v2\* root@YOUR_DROPLET_IP:/var/www/tomo-market/
```

### 4️⃣ تشغيل السكريبت
```bash
cd /var/www/tomo-market
chmod +x deploy.sh
./deploy.sh
```

### 5️⃣ إعداد قاعدة البيانات
```bash
sudo -u postgres psql
```
```sql
CREATE DATABASE tomomarket;
CREATE USER tomouser WITH PASSWORD 'STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE tomomarket TO tomouser;
ALTER USER tomouser CREATEDB;
\q
```

### 6️⃣ إعداد ملف .env
```bash
cd /var/www/tomo-market/backend
cp env.template .env
nano .env
```

### 7️⃣ بناء Frontend
```bash
cd /var/www/tomo-market/frontend
npm install
npm run build
```

### 8️⃣ إعداد Nginx
```bash
cp /var/www/tomo-market/nginx.conf /etc/nginx/sites-available/tomo-sa.com
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
- أضف A Record: `@` → `YOUR_DROPLET_IP`
- أضف A Record: `www` → `YOUR_DROPLET_IP`

### 1️⃣1️⃣ إعداد SSL
```bash
certbot --nginx -d tomo-sa.com -d www.tomo-sa.com
```

### ✅ جاهز!
افتح: `https://tomo-sa.com`

---

## 📚 للمزيد من التفاصيل

- **اقرأ DEPLOYMENT_GUIDE.md** للحصول على شرح مفصل لكل خطوة
- **اقرأ TROUBLESHOOTING.md** إذا واجهت مشاكل

---

## ⚠️ نصائح مهمة

1. **كلمات المرور القوية:** استخدم كلمات مرور قوية لـ:
   - قاعدة البيانات
   - JWT_SECRET
   - حساب root

2. **النسخ الاحتياطي:** قم بعمل نسخة احتياطية من:
   - قاعدة البيانات
   - ملف .env
   - ملفات الإعداد

3. **الأمان:**
   - لا تشارك ملف .env
   - استخدم SSH Keys بدلاً من كلمات المرور
   - فعّل Firewall

4. **المراقبة:**
   - راقب PM2: `pm2 monit`
   - راقب Logs: `pm2 logs`
   - راقب الموارد: `htop`

---

## 🆘 إذا واجهت مشاكل

1. تحقق من **TROUBLESHOOTING.md**
2. تحقق من Logs:
   ```bash
   pm2 logs
   tail -f /var/log/nginx/error.log
   ```
3. تحقق من الحالة:
   ```bash
   pm2 status
   systemctl status nginx
   systemctl status postgresql
   ```

---

**🎉 حظاً موفقاً في النشر!**

