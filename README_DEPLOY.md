# 📚 دليل النشر - TOMO Market

## 📖 الملفات المتوفرة

1. **DEPLOYMENT_GUIDE.md** - دليل شامل ومفصل خطوة بخطوة
2. **QUICK_DEPLOY.md** - دليل سريع للخطوات الأساسية
3. **nginx.conf** - إعدادات Nginx
4. **ecosystem.config.js** - إعدادات PM2
5. **deploy.sh** - سكريبت تلقائي للنشر
6. **backend/env.template** - قالب ملف البيئة

### عناوين الإنتاج (Production — ثابتة)
- **العميل (Customer):** https://tomo-sa.com
- **الـ API (Backend):** https://api.tomo-sa.com

### متغيرات النشر (Production)
- **Backend:** `DATABASE_URL`, `JWT_SECRET`, `PORT` (انظر `backend/env.template`). لا تستخدم قيمة localhost لـ DATABASE_URL في Production.
- **Frontend (build):** عند بناء الواجهة للنشر ضع `VITE_API_URL=https://api.tomo-sa.com` حتى تصل طلبات الـ API وروابط OAuth إلى الـ API الصحيح.
- **تسجيل الدخول الاحتياطي (Fallback login):** مخصص للتطوير المحلي فقط. لا يُفعّل في Production أبداً. للتجربة بدون قاعدة بيانات: ضع `NODE_ENV=development` و `ALLOW_FALLBACK_LOGIN=true` في `.env` (انظر `backend/env.template`).

### OAuth (تسجيل الدخول عبر Google / Apple)
- **روابط الاستدعاء (Callback URLs)** — ثابتة، استخدمها كما هي في Google Cloud Console و Apple Developer:
  - **Google:** `https://api.tomo-sa.com/api/auth/oauth/google/callback`
  - **Apple:** `https://api.tomo-sa.com/api/auth/oauth/apple/callback`
- **روابط البدء (Start URLs)** التي يستخدمها الفرونت: تحافظ على `?redirect=...`
  - `https://api.tomo-sa.com/api/auth/oauth/google/start?redirect=...`
  - `https://api.tomo-sa.com/api/auth/oauth/apple/start?redirect=...`

---

## 🚀 البدء السريع

### الخطوة 1: إنشاء Droplet على DigitalOcean
1. اذهب إلى [DigitalOcean](https://digitalocean.com)
2. Create → Droplets
3. اختر Ubuntu 22.04 LTS
4. اختر Plan (2GB RAM على الأقل)
5. اضغط Create

### الخطوة 2: الاتصال بالخادم
```bash
ssh root@YOUR_DROPLET_IP
```

### الخطوة 3: رفع الملفات
من جهازك المحلي (PowerShell):
```powershell
scp -r C:\Users\Dell\Desktop\tomo-market-v2\* root@YOUR_DROPLET_IP:/var/www/tomo-market/
```

### الخطوة 4: تشغيل سكريبت النشر
```bash
cd /var/www/tomo-market
chmod +x deploy.sh
./deploy.sh
```

### الخطوة 5: إعداد قاعدة البيانات
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

### الخطوة 6: إعداد ملف .env
```bash
cd /var/www/tomo-market/backend
cp env.template .env
nano .env
```

### الخطوة 7: بناء Frontend
```bash
cd /var/www/tomo-market/frontend
npm install
npm run build
```

### الخطوة 8: إعداد Nginx
```bash
cp /var/www/tomo-market/nginx.conf /etc/nginx/sites-available/tomo-sa.com
ln -s /etc/nginx/sites-available/tomo-sa.com /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### الخطوة 9: إعداد PM2
```bash
cd /var/www/tomo-market
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### الخطوة 10: إعداد DNS في Hostinger
1. اذهب إلى [hPanel](https://hpanel.hostinger.com)
2. اختر دومين `tomo-sa.com`
3. اذهب إلى DNS
4. أضف A Record:
   - Name: `@`
   - Value: `YOUR_DROPLET_IP`
5. أضف A Record:
   - Name: `www`
   - Value: `YOUR_DROPLET_IP`

### الخطوة 11: إعداد SSL
```bash
certbot --nginx -d tomo-sa.com -d www.tomo-sa.com
```

### ✅ جاهز!
افتح: `https://tomo-sa.com`

---

## Windows Notes (تطوير محلي على Windows)

- **مجلد مزامن (OneDrive/Google Drive):** تجنّب تشغيل `npm ci` أو `npm run build` داخل مجلد مزامن (مثل `Desktop` أو `Documents`). المزامنة تقفل ملفات مثل `node_modules\@rollup\rollup-win32-x64-msvc\rollup.win32-x64-msvc.node` وتسبب **EPERM** عند الحذف/الاستبدال.
- **التوصية:** انسخ المستودع إلى مسار غير مزامن، مثلاً:
  ```powershell
  mkdir C:\dev -ErrorAction SilentlyContinue
  xcopy /E /I "C:\Users\...\tomo-market-v2" "C:\dev\tomo-market-v2"
  cd C:\dev\tomo-market-v2\frontend
  ```
- **أخطاء EPERM أو ENOENT (مثل `preflight.css` مفقود):** تحدث غالباً عندما المشروع داخل مجلد OneDrive والمجلد `node_modules` غير مكتمل أو مقفل. **الحل الموصى به:**
  1. انسخ المستودع بالكامل إلى مسار غير مزامن، مثلاً `C:\dev\tomo-market-v2`.
  2. من جذر المستودع الجديد نفّذ:
  ```powershell
  cd C:\dev\tomo-market-v2
  .\tools\windows\fix-npm-eperm.ps1
  ```
  (السكريبت يوقف Node، يحذف `frontend/node_modules`، ينظف الكاش، يعيد التثبيت والبناء.)
  أو يدوياً (بعد إغلاق IDE والمتصفح):
  ```powershell
  cd C:\dev\tomo-market-v2\frontend
  Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
  Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
  npm cache clean --force
  npm ci
  $env:VITE_API_URL = "https://api.tomo-sa.com"; npm run build
  ```
  على سيرفر الإنتاج استخدم `npm ci` و `npm run build` كما هو (بدون هذا السكريبت).

---

## 📞 للمساعدة

راجع **DEPLOYMENT_GUIDE.md** للتفاصيل الكاملة.

