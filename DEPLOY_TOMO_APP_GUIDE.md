# 🚀 دليل نقل التحديثات إلى /var/www/tomo-app

## 📋 المطلوب

نقل جميع ملفات `frontend/src` (بما فيها Admin) إلى السيرفر في `/var/www/tomo-app/frontend/src`

---

## 🎯 الطريقة الأسهل: FileZilla

### الخطوة 1: الاتصال

1. افتح FileZilla
2. اتصل بـ:
   ```
   Host: 138.68.245.29
   Username: root
   Password: [كلمة مرور SSH]
   Port: 22
   ```

### الخطوة 2: رفع ملفات frontend/src

1. **في الجانب الأيسر (Local)**:
   - اذهب إلى: `C:\Users\Dell\Desktop\tomo-market-v2\frontend\src`
   - حدد جميع الملفات والمجلدات (Ctrl+A)

2. **في الجانب الأيمن (Remote)**:
   - اذهب إلى: `/var/www/tomo-app/frontend/src`
   - إذا لم يكن المجلد موجوداً، أنشئه

3. **اسحب** جميع الملفات من الأيسر إلى الأيمن
   - أو اضغط زر **Upload** (↑)

4. **انتظر** حتى تنتهي عملية الرفع

### الخطوة 3: التحقق من الملفات المرفوعة

في FileZilla، تأكد من وجود:
- ✅ `/var/www/tomo-app/frontend/src/modules/admin/` (جميع ملفات Admin)
- ✅ `/var/www/tomo-app/frontend/src/App.tsx`
- ✅ `/var/www/tomo-app/frontend/src/components/`
- ✅ `/var/www/tomo-app/frontend/src/pages/`
- ✅ جميع الملفات الأخرى

---

## 🔧 الخطوة 4: بناء المشروع على السيرفر

استخدم PuTTY أو أي برنامج SSH:

1. **اتصل بالخادم**:
   ```
   Host: 138.68.245.29
   Port: 22
   Username: root
   ```

2. **نفّذ الأوامر التالية** (انسخ والصق كل أمر):

```bash
# الانتقال إلى مجلد المشروع
cd /var/www/tomo-app

# عرض قائمة الملفات المتغيرة (اختياري)
find frontend/src -type f | head -20

# تثبيت dependencies
cd frontend
npm install

# بناء المشروع للإنتاج
npm run build

# التحقق من أن dist تم تحديثه
stat frontend/dist/index.html

# إعادة تشغيل الباكند
pm2 restart tomo-backend
pm2 save

# التحقق من حالة PM2
pm2 status tomo-backend

# عرض آخر 20 سطر من logs للتأكد من "Serving production build"
pm2 logs tomo-backend --lines 20 --nostream
```

---

## ✅ التحقق من النجاح

### 1. تحقق من dist:
```bash
stat /var/www/tomo-app/frontend/dist/index.html
```
يجب أن يظهر timestamp حديث.

### 2. تحقق من PM2:
```bash
pm2 status tomo-backend
```
يجب أن يكون status: `online`

### 3. تحقق من Backend Logs:
```bash
pm2 logs tomo-backend --lines 10 --nostream
```
يجب أن ترى: `✅ Serving production build from frontend/dist`

### 4. تحقق من الموقع:
- افتح: https://tomo-sa.com
- افتح: https://tomo-sa.com/admin
- افتح: https://tomo-sa.com/admin/marketing

---

## 📝 ملخص الملفات المرفوعة

```
✅ frontend/src/* → /var/www/tomo-app/frontend/src/
   - modules/admin/* (جميع ملفات Admin)
   - components/*
   - pages/*
   - App.tsx
   - main.tsx
   - جميع الملفات الأخرى
```

---

## 🆘 استكشاف الأخطاء

### المشكلة: npm install فشل
```bash
cd /var/www/tomo-app/frontend
rm -rf node_modules package-lock.json
npm install
```

### المشكلة: npm run build فشل
```bash
# تحقق من الأخطاء
cd /var/www/tomo-app/frontend
npm run build 2>&1 | tee build.log
```

### المشكلة: PM2 لا يعمل
```bash
pm2 restart tomo-backend
pm2 logs tomo-backend --lines 50
```

### المشكلة: الموقع لا يعرض التحديثات
```bash
# تحقق من أن dist محدث
ls -lah /var/www/tomo-app/frontend/dist/

# تحقق من Nginx
nginx -t
systemctl reload nginx

# تحقق من Backend logs
pm2 logs tomo-backend --lines 30
```

---

## ⚡ سكريبت سريع (إذا كان لديك SSH keys)

إذا كان لديك SSH keys configured، يمكنك استخدام:

```powershell
powershell -ExecutionPolicy Bypass -File deploy-to-tomo-app-simple.ps1
```

---

**⏱️ الوقت المتوقع**: 5-10 دقائق

