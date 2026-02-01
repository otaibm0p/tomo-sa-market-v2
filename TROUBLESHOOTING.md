# 🔧 حل المشاكل الشائعة - TOMO Market Deployment

## ❌ المشكلة 1: الموقع لا يعمل (502 Bad Gateway)

### الأعراض:
- الموقع يعرض `502 Bad Gateway`
- أو صفحة بيضاء

### الحل:
```bash
# 1. تحقق من PM2
pm2 status
pm2 logs

# 2. إذا كان التطبيق متوقف، أعد تشغيله
pm2 restart tomo-market-backend

# 3. تحقق من المنفذ
netstat -tulpn | grep :5000

# 4. تحقق من ملف .env
cat /var/www/tomo-market/backend/.env
```

---

## ❌ المشكلة 2: قاعدة البيانات لا تتصل

### الأعراض:
- رسائل خطأ في PM2 logs عن قاعدة البيانات
- `ECONNREFUSED` أو `password authentication failed`

### الحل:
```bash
# 1. تحقق من PostgreSQL
systemctl status postgresql
sudo systemctl start postgresql

# 2. تحقق من الاتصال
psql -U tomouser -d tomomarket -h localhost

# 3. إذا فشل، تحقق من كلمة المرور في .env
cat /var/www/tomo-market/backend/.env | grep DATABASE_URL

# 4. أعد إنشاء المستخدم إذا لزم الأمر
sudo -u postgres psql
```

في PostgreSQL:
```sql
DROP USER IF EXISTS tomouser;
CREATE USER tomouser WITH PASSWORD 'YOUR_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE tomomarket TO tomouser;
ALTER USER tomouser CREATEDB;
\q
```

---

## ❌ المشكلة 3: SSL لا يعمل

### الأعراض:
- الموقع لا يعمل على HTTPS
- رسالة `NET::ERR_CERT_AUTHORITY_INVALID`

### الحل:
```bash
# 1. إعادة إصدار الشهادة
certbot renew --force-renewal

# 2. تحقق من الملفات
ls -la /etc/letsencrypt/live/tomo-sa.com/

# 3. تحقق من إعدادات Nginx
nginx -t
cat /etc/nginx/sites-available/tomo-sa.com | grep ssl_certificate

# 4. أعد تحميل Nginx
systemctl reload nginx
```

---

## ❌ المشكلة 4: DNS لا يعمل

### الأعراض:
- الموقع لا يفتح على `tomo-sa.com`
- يعمل فقط على IP

### الحل:
```bash
# 1. تحقق من DNS
nslookup tomo-sa.com
dig tomo-sa.com

# 2. تحقق من أن DNS يشير إلى IP الصحيح
# يجب أن يظهر IP الخاص بـ Droplet

# 3. في Hostinger:
# - تأكد من أن A Record يشير إلى IP الصحيح
# - انتظر 5-30 دقيقة حتى يتم نشر DNS
```

---

## ❌ المشكلة 5: Frontend لا يعمل (404)

### الأعراض:
- صفحة 404 عند فتح الموقع
- الملفات الثابتة لا تُحمّل

### الحل:
```bash
# 1. تحقق من وجود ملفات البناء
ls -la /var/www/tomo-market/frontend/dist/

# 2. إذا لم تكن موجودة، أعد البناء
cd /var/www/tomo-market/frontend
npm run build

# 3. تحقق من إعدادات Nginx
cat /etc/nginx/sites-available/tomo-sa.com | grep root

# 4. يجب أن يكون root يشير إلى:
# root /var/www/tomo-market/frontend/dist;
```

---

## ❌ المشكلة 6: API لا يعمل

### الأعراض:
- API يعيد `404` أو `CORS error`
- البيانات لا تُحمّل

### الحل:
```bash
# 1. تحقق من PM2 logs
pm2 logs tomo-market-backend

# 2. تحقق من أن Backend يعمل
curl http://localhost:5000/api/health

# 3. تحقق من إعدادات Nginx للـ API
cat /etc/nginx/sites-available/tomo-sa.com | grep "/api"

# 4. تحقق من CORS في server.js
# يجب أن يحتوي على tomo-sa.com في allowed origins
```

---

## ❌ المشكلة 7: الموقع بطيء

### الأعراض:
- الموقع بطيء في التحميل
- استجابة بطيئة

### الحل:
```bash
# 1. تحقق من الموارد
htop
df -h
free -h

# 2. تحقق من Logs
pm2 logs --lines 100
tail -f /var/log/nginx/error.log

# 3. تحقق من قاعدة البيانات
sudo -u postgres psql -d tomomarket -c "SELECT COUNT(*) FROM orders;"

# 4. فكر في ترقية Droplet إذا كانت الموارد منخفضة
```

---

## ❌ المشكلة 8: الصور لا تظهر

### الأعراض:
- الصور لا تُحمّل
- رسالة `404` للصور

### الحل:
```bash
# 1. تحقق من مجلد الصور
ls -la /var/www/tomo-market/backend/uploads/

# 2. تحقق من الصلاحيات
chmod -R 755 /var/www/tomo-market/backend/uploads/
chown -R www-data:www-data /var/www/tomo-market/backend/uploads/

# 3. تحقق من إعدادات Nginx للصور
# يجب أن يكون هناك location block للـ uploads
```

---

## ❌ المشكلة 9: Socket.IO لا يعمل

### الأعراض:
- Real-time updates لا تعمل
- رسائل WebSocket errors

### الحل:
```bash
# 1. تحقق من إعدادات Nginx للـ Socket.IO
cat /etc/nginx/sites-available/tomo-sa.com | grep socket.io

# 2. تحقق من PM2 logs
pm2 logs tomo-market-backend | grep socket

# 3. تحقق من CORS في server.js
# يجب أن يحتوي على tomo-sa.com
```

---

## ❌ المشكلة 10: PM2 لا يبدأ تلقائياً

### الأعراض:
- بعد إعادة تشغيل الخادم، التطبيق لا يعمل

### الحل:
```bash
# 1. إعداد PM2 startup
pm2 startup
# اتبع التعليمات المعروضة

# 2. حفظ القائمة الحالية
pm2 save

# 3. تحقق من Startup script
pm2 unstartup
pm2 startup
```

---

## 📞 الحصول على المساعدة

إذا لم تحل المشكلة:

1. **جمع المعلومات:**
```bash
pm2 logs --lines 50 > pm2_logs.txt
tail -50 /var/log/nginx/error.log > nginx_errors.txt
systemctl status nginx > nginx_status.txt
```

2. **تحقق من:**
   - PM2 status: `pm2 status`
   - Nginx status: `systemctl status nginx`
   - PostgreSQL status: `systemctl status postgresql`
   - Disk space: `df -h`
   - Memory: `free -h`

3. **راجع Logs:**
   - PM2: `pm2 logs`
   - Nginx: `tail -f /var/log/nginx/error.log`
   - System: `journalctl -xe`

---

## ✅ قائمة التحقق السريعة

- [ ] PM2 يعمل: `pm2 status`
- [ ] Nginx يعمل: `systemctl status nginx`
- [ ] PostgreSQL يعمل: `systemctl status postgresql`
- [ ] ملف .env موجود وصحيح
- [ ] Frontend تم بناؤه: `ls frontend/dist/`
- [ ] SSL يعمل: `certbot certificates`
- [ ] DNS يشير إلى IP الصحيح: `nslookup tomo-sa.com`
- [ ] Firewall مفتوح: `ufw status`
- [ ] المنافذ مفتوحة: `netstat -tulpn`

