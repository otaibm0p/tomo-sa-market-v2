# 🚀 دليل النشر الكامل - TOMO Market على DigitalOcean

> **ملاحظة:** أدوات التطوير المحلي فقط (مثل `run-local.bat`, `dev-server.mjs`) إن وُجدت توضع تحت `tools/dev` ولا تُستخدم في Production.

## 📋 المتطلبات الأساسية

### 1. متطلبات DigitalOcean
- Droplet (Ubuntu 22.04 LTS) - على الأقل 2GB RAM
- IP Address ثابت
- Firewall مُفعّل

### 2. متطلبات Hostinger
- دومين: `tomo-sa.com`
- إمكانية تعديل DNS Records

---

## 🔧 الخطوة 1: إعداد Droplet على DigitalOcean

### 1.1 إنشاء Droplet جديد
1. اذهب إلى DigitalOcean Dashboard
2. Create → Droplets
3. اختر:
   - **Image**: Ubuntu 22.04 LTS
   - **Plan**: Basic - $12/month (2GB RAM) أو أعلى
   - **Datacenter**: أقرب منطقة لك
   - **Authentication**: SSH Keys (مُوصى به) أو Password
4. اضغط **Create Droplet**

### 1.2 الاتصال بالـ Droplet
```bash
ssh root@YOUR_DROPLET_IP
```

---

## 🔧 الخطوة 2: إعداد الخادم (Server Setup)

### 2.1 تحديث النظام
```bash
apt update && apt upgrade -y
```

### 2.2 تثبيت Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v  # يجب أن يظهر v18.x.x
npm -v
```

### 2.3 تثبيت PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

### 2.4 تثبيت Nginx
```bash
apt install -y nginx
systemctl start nginx
systemctl enable nginx
```

### 2.5 تثبيت PM2
```bash
npm install -g pm2
```

### 2.6 تثبيت Certbot (للـ SSL)
```bash
apt install -y certbot python3-certbot-nginx
```

---

## 🔧 الخطوة 3: إعداد قاعدة البيانات

### 3.1 إنشاء قاعدة بيانات جديدة
```bash
sudo -u postgres psql
```

في PostgreSQL:
```sql
CREATE DATABASE tomomarket;
CREATE USER tomouser WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE tomomarket TO tomouser;
ALTER USER tomouser CREATEDB;
\q
```

### 3.2 اختبار الاتصال
```bash
psql -U tomouser -d tomomarket -h localhost
```

---

## 🔧 الخطوة 4: رفع الملفات إلى الخادم

### 4.1 إنشاء مجلد المشروع
```bash
mkdir -p /var/www/tomo-market
cd /var/www/tomo-market
```

### 4.2 رفع الملفات (اختر طريقة واحدة)

#### الطريقة 1: Git (مُوصى به)
```bash
apt install -y git
git clone YOUR_REPOSITORY_URL .
# أو إذا كان المشروع محلياً:
# استخدم scp أو rsync
```

#### الطريقة 2: SCP (من جهازك المحلي)
```bash
# من جهازك المحلي (Windows PowerShell):
scp -r C:\Users\Dell\Desktop\tomo-market-v2\* root@YOUR_DROPLET_IP:/var/www/tomo-market/
```

#### الطريقة 3: استخدام FileZilla أو WinSCP
- استخدم SFTP للاتصال بالخادم
- ارفع جميع الملفات إلى `/var/www/tomo-market/`

---

## 🔧 الخطوة 5: إعداد Backend

### 5.1 تثبيت Dependencies
```bash
cd /var/www/tomo-market/backend
npm install --production
```

### 5.2 إنشاء ملف .env
```bash
nano /var/www/tomo-market/backend/.env
```

أضف المحتوى التالي:
```env
NODE_ENV=production
PORT=5000
JWT_SECRET=YOUR_VERY_STRONG_SECRET_KEY_HERE_CHANGE_THIS
DATABASE_URL=postgresql://tomouser:YOUR_PASSWORD@localhost:5432/tomomarket

# Domain
DOMAIN=tomo-sa.com
```

**⚠️ مهم:** غيّر `JWT_SECRET` و `YOUR_PASSWORD` بقيم قوية!

### 5.3 اختبار Backend
```bash
cd /var/www/tomo-market/backend
node server.js
```

إذا عمل بشكل صحيح، اضغط `Ctrl+C` لإيقافه.

---

## 🔧 الخطوة 6: بناء Frontend

### 6.1 تثبيت Dependencies
```bash
cd /var/www/tomo-market/frontend
npm install
```

### 6.2 بناء المشروع
```bash
npm run build
```

يجب أن يظهر مجلد `dist/` مع الملفات المبنية.

---

## 🔧 الخطوة 7: إعداد PM2

### 7.1 إنشاء ملف PM2 Config
```bash
nano /var/www/tomo-market/ecosystem.config.js
```

أضف المحتوى من ملف `ecosystem.config.js` (سيتم إنشاؤه لاحقاً)

### 7.2 تشغيل التطبيق بـ PM2
```bash
cd /var/www/tomo-market
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7.3 التحقق من الحالة
```bash
pm2 status
pm2 logs
```

---

## 🔧 الخطوة 8: إعداد Nginx

### 8.1 إنشاء ملف Configuration
```bash
nano /etc/nginx/sites-available/tomo-sa.com
```

أضف المحتوى من ملف `nginx.conf` (سيتم إنشاؤه لاحقاً)

### 8.2 تفعيل الموقع
```bash
ln -s /etc/nginx/sites-available/tomo-sa.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # حذف الافتراضي
nginx -t  # اختبار الإعدادات
systemctl reload nginx
```

---

## 🔧 الخطوة 9: إعداد DNS في Hostinger

### 9.1 تسجيل الدخول إلى Hostinger
1. اذهب إلى [hPanel](https://hpanel.hostinger.com)
2. اختر دومين `tomo-sa.com`
3. اذهب إلى **DNS / Name Servers**

### 9.2 إضافة DNS Records
أضف السجلات التالية:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_DROPLET_IP | 3600 |
| A | www | YOUR_DROPLET_IP | 3600 |

**مثال:**
- Type: `A`
- Name: `@` (أو اتركه فارغاً)
- Value: `138.68.245.29` (IP الخاص بك)
- TTL: `3600`

### 9.3 الانتظار
انتظر 5-30 دقيقة حتى يتم نشر DNS.

---

## 🔧 الخطوة 10: إعداد SSL (HTTPS)

### 10.1 الحصول على شهادة SSL
```bash
certbot --nginx -d tomo-sa.com -d www.tomo-sa.com
```

اتبع التعليمات:
- أدخل بريدك الإلكتروني
- اقرأ ووافق على الشروط
- اختر `2` لإعادة توجيه HTTP إلى HTTPS

### 10.2 اختبار التجديد التلقائي
```bash
certbot renew --dry-run
```

---

## 🔧 الخطوة 11: إعداد Firewall

### 11.1 إعداد UFW
```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

---

## 🔧 الخطوة 12: التحقق من النشر

### 12.1 اختبار الموقع
افتح المتصفح واذهب إلى:
- `http://tomo-sa.com` (يجب أن يعيد توجيهك إلى HTTPS)
- `https://tomo-sa.com`

### 12.2 اختبار API
```bash
curl https://tomo-sa.com/api/health
```

يجب أن يعيد: `{"status":"TOMO Market Backend Running ?"}`

---

## 🔧 الخطوة 13: المراقبة والصيانة

### 13.1 مراقبة PM2
```bash
pm2 monit
pm2 logs
```

### 13.2 مراقبة Nginx
```bash
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log
```

### 13.3 تحديث التطبيق
```bash
cd /var/www/tomo-market
git pull  # إذا كنت تستخدم Git
cd backend && npm install
cd ../frontend && npm install && npm run build
pm2 restart all
```

---

## 🐛 حل المشاكل الشائعة

### المشكلة 1: الموقع لا يعمل
```bash
# تحقق من PM2
pm2 status
pm2 logs

# تحقق من Nginx
systemctl status nginx
nginx -t

# تحقق من المنافذ
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

### المشكلة 2: قاعدة البيانات لا تتصل
```bash
# تحقق من PostgreSQL
systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# تحقق من الاتصال
psql -U tomouser -d tomomarket -h localhost
```

### المشكلة 3: SSL لا يعمل
```bash
# إعادة إصدار الشهادة
certbot renew --force-renewal
systemctl reload nginx
```

### المشكلة 4: الموقع بطيء
```bash
# تحقق من الموارد
htop
df -h
free -h
```

---

## 📞 الدعم

إذا واجهت مشاكل:
1. تحقق من Logs: `pm2 logs` و `tail -f /var/log/nginx/error.log`
2. تأكد من أن جميع الخدمات تعمل: `systemctl status nginx postgresql`
3. تحقق من Firewall: `ufw status`

---

## ✅ قائمة التحقق النهائية

- [ ] Droplet تم إنشاؤه على DigitalOcean
- [ ] Node.js و PostgreSQL و Nginx مثبتة
- [ ] قاعدة البيانات تم إنشاؤها
- [ ] الملفات تم رفعها إلى الخادم
- [ ] ملف `.env` تم إنشاؤه
- [ ] Frontend تم بناؤه (`npm run build`)
- [ ] PM2 يعمل (`pm2 status`)
- [ ] Nginx مُعد بشكل صحيح
- [ ] DNS Records تم إضافتها في Hostinger
- [ ] SSL تم إعداده (`https://tomo-sa.com`)
- [ ] الموقع يعمل بشكل صحيح

---

**🎉 تهانينا! موقعك الآن على الإنترنت!**

