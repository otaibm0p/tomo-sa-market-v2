# 🔧 تحديث المنفذ من 5000 إلى 3000

## ⚠️ تم تحديث الملفات التالية:

1. ✅ `nginx.conf` - تم تغيير `localhost:5000` إلى `localhost:3000`
2. ✅ `ecosystem.config.js` - تم تغيير `PORT: 5000` إلى `PORT: 3000`
3. ✅ `backend/server.js` - تم تغيير المنفذ الافتراضي إلى 3000

---

## 📋 الخطوات المطلوبة على الخادم:

### 1. تحديث ملف Nginx

```bash
# على الخادم
nano /etc/nginx/sites-available/tomo-sa.com
```

تأكد من أن السطور التالية تحتوي على `3000`:
- `proxy_pass http://localhost:3000;` (في location /api)
- `proxy_pass http://localhost:3000;` (في location /socket.io)

### 2. اختبار وإعادة تحميل Nginx

```bash
nginx -t  # اختبار الإعدادات
systemctl reload nginx  # إعادة التحميل
```

### 3. تحديث PM2 Config

```bash
# على الخادم
nano /var/www/tomo-market/ecosystem.config.js
```

تأكد من أن `PORT: 3000`

### 4. إعادة تشغيل PM2

```bash
cd /var/www/tomo-market
pm2 delete tomo-market-backend
pm2 start ecosystem.config.js
pm2 save
```

### 5. التحقق

```bash
# تحقق من أن Backend يعمل على المنفذ 3000
netstat -tulpn | grep :3000

# تحقق من PM2
pm2 status
pm2 logs tomo-market-backend
```

---

## ✅ بعد التحديث:

- ✅ Nginx يوجه الطلبات إلى `localhost:3000`
- ✅ PM2 يشغل Backend على المنفذ `3000`
- ✅ Backend يستمع على المنفذ `3000`

---

## 🐛 إذا واجهت مشاكل:

### المشكلة: 502 Bad Gateway

```bash
# تحقق من أن Backend يعمل
pm2 status
pm2 logs tomo-market-backend

# تحقق من المنفذ
netstat -tulpn | grep :3000
```

### المشكلة: Nginx لا يعمل

```bash
# تحقق من الإعدادات
nginx -t

# تحقق من Logs
tail -f /var/log/nginx/error.log
```

---

## 📝 ملاحظات:

- إذا كان Backend يعمل بالفعل على 3000 في الخادم، فكل شيء جاهز ✅
- فقط تأكد من تحديث Nginx و PM2 Config
- بعد التحديث، أعد تشغيل PM2 و Nginx

