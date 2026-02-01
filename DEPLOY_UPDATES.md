# 🚀 نقل التحديثات إلى الموقع المباشر - tomo-sa.com

## 📋 التحديثات التي تمت اليوم

1. ✅ إصلاح قسم التسويق في Admin Sidebar
2. ✅ تحديثات Marketing Dashboard
3. ✅ تحديثات CORS في Backend
4. ✅ إصلاح عرض الأرقام باللغة الإنجليزية في Dashboard

---

## 🔧 الخطوة 1: بناء Frontend مع التحديثات

### على جهازك المحلي:

```powershell
# انتقل إلى مجلد Frontend
cd C:\Users\Dell\Desktop\tomo-market-v2\frontend

# تثبيت Dependencies (إذا لزم الأمر)
npm install

# بناء المشروع
npm run build
```

**انتظر حتى يكتمل البناء** - يجب أن يظهر مجلد `dist/` مع الملفات الجديدة.

---

## 🔧 الخطوة 2: رفع الملفات إلى الخادم

### 2.1 رفع Frontend (الملفات المبنية)

```powershell
# من PowerShell في مجلد المشروع
scp -r frontend/dist/* root@138.68.245.29:/var/www/tomo-market/frontend/dist/
```

### 2.2 رفع Backend (server.js المحدث)

```powershell
scp backend/server.js root@138.68.245.29:/var/www/tomo-market/backend/
```

---

## 🔧 الخطوة 3: على الخادم - إعادة تشغيل الخدمات

### 3.1 الاتصال بالخادم

```powershell
ssh root@138.68.245.29
```

### 3.2 التحقق من الملفات

```bash
# التحقق من Frontend
ls -la /var/www/tomo-market/frontend/dist/

# التحقق من Backend
ls -la /var/www/tomo-market/backend/server.js
```

### 3.3 إعادة بناء Frontend (اختياري - للتأكد)

```bash
cd /var/www/tomo-market/frontend
npm install  # إذا كانت هناك dependencies جديدة
npm run build
```

### 3.4 إعادة تشغيل PM2

```bash
cd /var/www/tomo-market
pm2 restart tomo-market-backend
pm2 logs  # للتحقق من عدم وجود أخطاء
```

### 3.5 إعادة تحميل Nginx (إذا لزم الأمر)

```bash
nginx -t  # اختبار الإعدادات
systemctl reload nginx
```

---

## ✅ الخطوة 4: التحقق من التحديثات

### 4.1 اختبار الموقع

افتح المتصفح واذهب إلى:
- `https://tomo-sa.com` ✅
- `https://tomo-sa.com/admin` ✅
- `https://tomo-sa.com/admin/marketing` ✅

### 4.2 التحقق من التحديثات

1. **قسم التسويق:**
   - اذهب إلى `/admin`
   - تحقق من ظهور قسم "التسويق والإعلان" في Sidebar ✅

2. **لوحة التسويق:**
   - اذهب إلى `/admin/marketing`
   - تحقق من عمل الصفحة بشكل صحيح ✅

3. **Dashboard:**
   - تحقق من أن الأرقام تظهر بالإنجليزية ✅

---

## 🐛 إذا واجهت مشاكل

### المشكلة: الموقع لا يعمل بعد التحديث

```bash
# على الخادم
pm2 logs tomo-market-backend --lines 50
tail -50 /var/log/nginx/error.log
```

### المشكلة: Frontend لا يُحدّث

```bash
# تأكد من رفع الملفات بشكل صحيح
ls -la /var/www/tomo-market/frontend/dist/

# أعد البناء على الخادم
cd /var/www/tomo-market/frontend
npm run build
```

### المشكلة: Backend لا يعمل

```bash
# تحقق من ملف .env
cat /var/www/tomo-market/backend/.env

# تحقق من PM2
pm2 status
pm2 restart tomo-market-backend
```

---

## 📝 قائمة التحقق

- [ ] تم بناء Frontend محلياً (`npm run build`)
- [ ] تم رفع ملفات `frontend/dist/*` إلى الخادم
- [ ] تم رفع `backend/server.js` إلى الخادم
- [ ] تم إعادة تشغيل PM2 (`pm2 restart`)
- [ ] تم التحقق من Logs (`pm2 logs`)
- [ ] الموقع يعمل: `https://tomo-sa.com`
- [ ] قسم التسويق يظهر في Admin Sidebar
- [ ] لوحة التسويق تعمل: `/admin/marketing`

---

## 🎯 سكريبت سريع (كل شيء في أمر واحد)

### على جهازك المحلي (PowerShell):

```powershell
# 1. بناء Frontend
cd C:\Users\Dell\Desktop\tomo-market-v2\frontend
npm run build

# 2. رفع Frontend
cd ..
scp -r frontend/dist/* root@138.68.245.29:/var/www/tomo-market/frontend/dist/

# 3. رفع Backend
scp backend/server.js root@138.68.245.29:/var/www/tomo-market/backend/

# 4. إعادة تشغيل على الخادم
ssh root@138.68.245.29 "cd /var/www/tomo-market && pm2 restart tomo-market-backend && pm2 logs --lines 20"
```

---

**🎉 بعد اكتمال الخطوات، ستكون جميع التحديثات على الموقع المباشر!**

