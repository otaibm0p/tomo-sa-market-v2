# 🔄 تحديث النشر الموجود - TOMO Market

## 📋 الوضع الحالي

لديك:
- ✅ Droplet على DigitalOcean يعمل
- ✅ DNS Records موجودة على DigitalOcean
- ✅ الدومين `tomo-sa.com` على Hostinger
- ⚠️ تحتاج إلى تحديث الكود والتأكد من إعدادات DNS

---

## 🔧 الخطوة 1: تحديث الكود على الخادم

### 1.1 رفع الملفات الجديدة

من جهازك المحلي (PowerShell):
```powershell
# رفع ملفات Backend المحدثة
scp backend/server.js root@138.68.245.29:/var/www/tomo-market/backend/

# رفع ملفات Frontend المحدثة (إذا تم تحديثها)
scp -r frontend/dist/* root@138.68.245.29:/var/www/tomo-market/frontend/dist/
```

### 1.2 على الخادم

```bash
ssh root@138.68.245.29
cd /var/www/tomo-market/backend

# التحقق من التغييرات
git diff server.js  # إذا كنت تستخدم Git
# أو
cat server.js | grep "tomo-sa.com"  # للتحقق من CORS
```

### 1.3 إعادة تشغيل PM2

```bash
pm2 restart tomo-market-backend
pm2 logs  # للتحقق من عدم وجود أخطاء
```

---

## 🌐 الخطوة 2: إصلاح DNS في DigitalOcean

### 2.1 المشكلة الحالية

من الصورة:
- ✅ A Record: `tomo-sa.com` → `138.68.245.29` (صحيح)
- ❌ CNAME: `www.tomo-sa.com` → `ns3.digitalocean.com` (خطأ!)

### 2.2 الحل

1. **اذهب إلى DigitalOcean Dashboard**
2. **Networking → Domains → tomo-sa.com**
3. **احذف CNAME Record:**
   - ابحث عن `www.tomo-sa.com` (CNAME)
   - اضغط على `...` → Delete

4. **أضف A Record جديد:**
   - اضغط "Create a record"
   - **Type:** A
   - **Hostname:** `www`
   - **Value:** `138.68.245.29`
   - **TTL:** `3600`
   - اضغط "Create record"

### 2.3 التحقق

بعد 5-10 دقائق:
```bash
nslookup www.tomo-sa.com
# يجب أن يعيد: 138.68.245.29
```

---

## 🔐 الخطوة 3: التحقق من Nameservers في Hostinger

### 3.1 التحقق

1. **اذهب إلى Hostinger hPanel**
2. **اختر دومين `tomo-sa.com`**
3. **اذهب إلى "DNS / Name Servers"**
4. **تحقق من Nameservers:**

يجب أن تكون:
```
ns1.digitalocean.com
ns2.digitalocean.com
ns3.digitalocean.com
```

### 3.2 إذا كانت مختلفة

1. **غيّر Nameservers إلى DigitalOcean:**
   - أدخل:
     - `ns1.digitalocean.com`
     - `ns2.digitalocean.com`
     - `ns3.digitalocean.com`
   - احفظ
   - انتظر 5-30 دقيقة

---

## ✅ الخطوة 4: التحقق من كل شيء

### 4.1 اختبار DNS

```bash
# من جهازك المحلي
nslookup tomo-sa.com
nslookup www.tomo-sa.com

# يجب أن يعيد: 138.68.245.29 لكليهما
```

### 4.2 اختبار الموقع

افتح المتصفح:
- `https://tomo-sa.com` ✅
- `https://www.tomo-sa.com` ✅

### 4.3 اختبار API

```bash
curl https://tomo-sa.com/api/health
# يجب أن يعيد: {"status":"TOMO Market Backend Running ?"}
```

### 4.4 اختبار CORS

افتح Developer Console (F12) وتحقق من عدم وجود أخطاء CORS.

---

## 🔄 قائمة التحقق

- [ ] تم رفع `server.js` المحدث إلى الخادم
- [ ] تم إعادة تشغيل PM2: `pm2 restart tomo-market-backend`
- [ ] تم حذف CNAME: `www.tomo-sa.com` → `ns3.digitalocean.com`
- [ ] تم إضافة A Record: `www.tomo-sa.com` → `138.68.245.29`
- [ ] Nameservers في Hostinger تشير إلى DigitalOcean
- [ ] DNS يعمل: `nslookup tomo-sa.com` يعيد `138.68.245.29`
- [ ] الموقع يعمل: `https://tomo-sa.com`
- [ ] الموقع يعمل: `https://www.tomo-sa.com`
- [ ] لا توجد أخطاء CORS في Console

---

## 🐛 إذا واجهت مشاكل

### المشكلة: الموقع لا يعمل
```bash
# على الخادم
pm2 logs
systemctl status nginx
```

### المشكلة: DNS لا يعمل
- انتظر 5-30 دقيقة
- تحقق من Nameservers في Hostinger
- استخدم https://dnschecker.org للتحقق

### المشكلة: CORS errors
- تحقق من أن `tomo-sa.com` موجود في CORS في `server.js`
- أعد تشغيل PM2: `pm2 restart tomo-market-backend`

---

## 📝 ملخص التغييرات

### ما تم تحديثه في الكود:
1. ✅ CORS: تم إضافة `tomo-sa.com` و `www.tomo-sa.com`
2. ✅ Dynamic Droplet IP: يمكن إضافة من متغير البيئة

### ما يجب فعله:
1. ✅ رفع `server.js` المحدث
2. ✅ إعادة تشغيل PM2
3. ✅ إصلاح DNS (CNAME → A Record)
4. ✅ التحقق من Nameservers

---

**🎯 الخطوة التالية:** ابدأ بإصلاح DNS في DigitalOcean (CNAME → A Record)!

