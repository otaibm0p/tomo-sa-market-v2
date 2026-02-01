# 📋 دليل Migration للـ Schema الجديد

## 📌 نظرة عامة

تم إنشاء migration scripts للتحويل من الـ schema الحالي (PostgreSQL) إلى الـ schema الجديد.

## 📁 الملفات

1. **`backend/migrations/0006_new_schema_migration.sql`** - PostgreSQL Migration
2. **`backend/migrations/0006_new_schema_migration_mysql.sql`** - MySQL Migration (Schema جديد كامل)

## 🔄 التغييرات الرئيسية

### 1. جدول Users
- ✅ إضافة `full_name` (بدلاً من `name`)
- ✅ إضافة `phone` (UNIQUE)
- ✅ تغيير `role` إلى ENUM: `customer`, `store_staff`, `driver`, `admin`
- ✅ إضافة `status`: `active`, `disabled`

### 2. جدول Stores
- ✅ إضافة `internal_name` (اسم داخلي)
- ✅ إضافة `is_open_now` و `is_busy`
- ✅ إضافة `prep_time_min` (وقت التجهيز)
- ✅ تغيير `latitude/longitude` إلى `lat/lng`

### 3. جداول جديدة
- ✅ `store_users` - ربط الموظفين بالمتاجر
- ✅ `zones` - المناطق (مبسط)
- ✅ `store_zones` - ربط المتاجر بالمناطق
- ✅ `customer_addresses` - عناوين العملاء
- ✅ `store_products` - بدلاً من `store_inventory`
- ✅ `order_status_history` - سجل حالات الطلب

### 4. جدول Orders
- ✅ إضافة `public_code` (رقم طلب للعميل)
- ✅ تغيير `status` إلى ENUM شامل
- ✅ إضافة `payment_status` منفصل
- ✅ إضافة `subtotal`, `delivery_fee`, `service_fee`, `discount`
- ✅ إضافة `zone_id` و `address_id`

### 5. جدول Drivers
- ✅ ربط مباشر بـ `user_id` (بدلاً من `id` منفصل)
- ✅ `status`: `offline`, `online`, `busy`, `suspended`

## 🚀 كيفية التنفيذ

### للـ PostgreSQL (المشروع الحالي)

```bash
# 1. Backup قاعدة البيانات أولاً!
pg_dump -U your_user -d your_database > backup_before_migration.sql

# 2. تشغيل Migration
psql -U your_user -d your_database -f backend/migrations/0006_new_schema_migration.sql

# 3. التحقق من النتائج
psql -U your_user -d your_database -c "\dt"
```

### للـ MySQL (إذا كنت تريد التحويل)

```bash
# 1. Backup قاعدة البيانات
mysqldump -u your_user -p your_database > backup_before_migration.sql

# 2. تشغيل Migration
mysql -u your_user -p your_database < backend/migrations/0006_new_schema_migration_mysql.sql
```

## ⚠️ تحذيرات مهمة

1. **Backup أولاً!** - احفظ نسخة احتياطية قبل أي migration
2. **Test على Development** - اختبر على بيئة تطوير أولاً
3. **Data Migration** - بعض البيانات قد تحتاج migration يدوي
4. **Code Updates** - ستحتاج تحديث الكود ليتوافق مع الـ schema الجديد

## 📝 ملاحظات

- الـ migration script يحاول الحفاظ على البيانات الموجودة
- بعض الجداول القديمة قد تُحذف (مثل `store_inventory`)
- قد تحتاج تحديث الكود في:
  - `backend/server.js` - API routes
  - `frontend/src/utils/api.ts` - API calls
  - جميع المكونات التي تستخدم هذه الجداول

## 🔧 الخطوات التالية بعد Migration

1. تحديث `backend/server.js` لاستخدام الجداول الجديدة
2. تحديث API endpoints
3. تحديث Frontend components
4. اختبار شامل
5. تحديث Documentation

---

**تم الإنشاء:** 2025-01-24
