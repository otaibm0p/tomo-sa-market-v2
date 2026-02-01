# 🛒 TOMO Market - نظام إدارة المتجر الإلكتروني

## 📋 نظرة عامة

نظام متكامل لإدارة المتجر الإلكتروني مع لوحة تحكم احترافية، إدارة الطلبات، المنتجات، الموظفين، والسائقين.

## ✨ المميزات الرئيسية

- ✅ **لوحة تحكم الأدمن** - إدارة كاملة للمتجر
- ✅ **إعدادات المتجر** - Logo، Social Media، Contact Info
- ✅ **إدارة المنتجات** - مع دعم الوحدات (kg, g, piece, bag)
- ✅ **إدارة الطلبات** - مع Smart Batching حسب الموقع
- ✅ **إدارة الموظفين** - مع Toggle Switch للتفعيل/التعطيل
- ✅ **نظام السائقين** - Dashboard مع GPS Navigation
- ✅ **نظام التقييمات** - تقييم السائقين بعد التسليم
- ✅ **Header & Footer ديناميكي** - يجلب البيانات من API
- ✅ **تصميم احترافي** - Emerald Green + Cairo Font

## 🚀 كيفية التشغيل

### المتطلبات الأساسية

- Docker & Docker Compose
- Node.js (للتطوير المحلي)
- npm أو yarn

### خطوات التشغيل

#### 1️⃣ تشغيل Backend & Database (Docker)

```bash
# تشغيل Docker Containers
docker-compose up -d

# التحقق من حالة Containers
docker-compose ps

# عرض Logs
docker-compose logs -f backend
```

**النتيجة المتوقعة:**
- ✅ Database يعمل على `localhost:5432`
- ✅ Backend API يعمل على `http://localhost:3000`

#### 2️⃣ تشغيل Frontend (Development Server)

```bash
# الانتقال لمجلد Frontend
cd frontend

# تثبيت Dependencies (إذا لم تكن مثبتة)
npm install

# تشغيل Development Server
npm run dev
```

**النتيجة المتوقعة:**
- ✅ Frontend يعمل على `http://localhost:5173`

#### 3️⃣ الوصول للتطبيق

- **الموقع الرئيسي:** `http://localhost:5173`
- **لوحة التحكم:** `http://localhost:5173/admin`
- **API Backend:** `http://localhost:3000/api`

## 📁 بنية المشروع

```
tomo-market-v2/
├── backend/              # Backend API (Node.js + Express)
│   ├── server.js        # Main server file
│   ├── package.json
│   └── Dockerfile
├── frontend/            # Frontend (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/  # Header, Footer, AdminSidebar
│   │   ├── pages/       # Home, Admin, Driver, etc.
│   │   ├── utils/       # API client
│   │   └── context/     # Cart Context
│   ├── package.json
│   └── vite.config.js
└── docker-compose.yml   # Docker configuration
```

## 🔐 الحسابات الافتراضية

بعد أول تشغيل، قم بإنشاء حساب أدمن من خلال:
1. افتح `http://localhost:5173/login`
2. سجل حساب جديد
3. في قاعدة البيانات، قم بتغيير `role` إلى `'admin'` في جدول `users`

أو استخدم SQL:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## 🛠️ الأوامر المفيدة

### Docker Commands

```bash
# إعادة تشغيل Backend
docker-compose restart backend

# إيقاف جميع Containers
docker-compose down

# إيقاف وحذف البيانات
docker-compose down -v

# عرض Logs
docker-compose logs -f
```

### Frontend Commands

```bash
# تثبيت Dependencies
npm install

# تشغيل Development Server
npm run dev

# بناء Production
npm run build

# Preview Production Build
npm run preview
```

## 📝 الصفحات الرئيسية

### للمستخدمين
- `/` - الصفحة الرئيسية
- `/categories` - الفئات والمنتجات
- `/product/:id` - تفاصيل المنتج
- `/cart` - سلة التسوق
- `/orders` - طلباتي
- `/login` - تسجيل الدخول

### للأدمن
- `/admin` - لوحة التحكم الرئيسية
- `/admin/orders` - إدارة الطلبات
- `/admin/products` - إدارة المنتجات
- `/admin/categories` - إدارة التصنيفات
- `/admin/staff` - إدارة الموظفين
- `/admin/settings` - إعدادات المتجر

### للسائقين
- `/driver/tasks` - مهام السائق

## 🎨 التصميم

- **الخط:** Cairo (من Google Fonts)
- **الألوان:**
  - Emerald Green: `#064e3b` (الرئيسي)
  - Deep Blue: `#1a237e` (للعنوانات)
  - Fresh Green: `#2e7d32` (للأزرار)
  - Soft Gray: للخلفيات

## 🔧 استكشاف الأخطاء

### المشكلة: Backend لا يعمل
```bash
# تحقق من Logs
docker-compose logs backend

# إعادة بناء Container
docker-compose up -d --build backend
```

### المشكلة: Frontend لا يتصل بالـ Backend
- تأكد من أن Backend يعمل على `http://localhost:3000`
- تحقق من `vite.config.js` - Proxy يجب أن يكون `/api` → `http://localhost:3000`

### المشكلة: Database Connection Error
```bash
# تحقق من Database Container
docker-compose ps db

# إعادة تشغيل Database
docker-compose restart db
```

## 📦 الملفات المهمة

### Backend
- `backend/server.js` - Main API server
- `backend/package.json` - Dependencies

### Frontend
- `frontend/src/App.tsx` - Main App component
- `frontend/src/components/Header.tsx` - Header مع Admin Icon
- `frontend/src/components/Footer.tsx` - Footer ديناميكي
- `frontend/src/pages/Admin/*` - صفحات الأدمن
- `frontend/src/utils/api.ts` - API client

## 🚀 Production Deployment

للتشغيل في Production:

1. **بناء Frontend:**
```bash
cd frontend
npm run build
```

2. **تحديث Docker Compose** لإضافة Frontend service

3. **تحديث Environment Variables** في `docker-compose.yml`

## 📞 الدعم

إذا واجهت أي مشاكل:
1. تحقق من Logs: `docker-compose logs`
2. تأكد من أن جميع Containers تعمل: `docker-compose ps`
3. تحقق من Network: `http://localhost:3000/api/products`

---

**تم التطوير بواسطة:** TOMO Market Team  
**التاريخ:** 2024

