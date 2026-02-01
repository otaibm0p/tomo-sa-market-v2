# 📋 ملخص تحديث Schema - TOMO Market

**التاريخ:** 2025-01-24

## ✅ ما تم تحديثه

### 1. جدول Users ✅
- ✅ إضافة `full_name` (بدلاً من `name` فقط)
- ✅ إضافة `phone` (UNIQUE)
- ✅ إضافة `status` (active/disabled)
- ✅ تحديث جميع queries لاستخدام `full_name`
- ✅ Migration script يحول `name` إلى `full_name`

### 2. جدول Stores ✅
- ✅ إضافة `internal_name`
- ✅ إضافة `is_open_now` و `is_busy`
- ✅ إضافة `prep_time_min`
- ✅ إضافة `lat/lng` (بدلاً من latitude/longitude)
- ✅ إضافة `address_text`
- ✅ إضافة `status` (active/inactive)

### 3. جدول Orders ✅
- ✅ إضافة `public_code` (رقم طلب للعميل)
- ✅ إضافة `customer_id` (بدلاً من user_id فقط)
- ✅ إضافة `zone_id` و `address_id`
- ✅ إضافة `subtotal`, `delivery_fee`, `service_fee`, `discount`
- ✅ إضافة `payment_status` منفصل
- ✅ تحديث `status` إلى ENUM شامل
- ✅ تحديث order creation query

### 4. جدول Order Items ✅
- ✅ إضافة `product_name` (snapshot)
- ✅ إضافة `qty` (INTEGER)
- ✅ إضافة `line_total`
- ✅ إضافة `status` (active/substituted/removed)
- ✅ تحديث جميع INSERT queries

### 5. جدول Drivers ✅
- ✅ تحديث لاستخدام `user_id` كـ primary key
- ✅ إضافة `last_lat/last_lng`
- ✅ إضافة `last_seen_at`
- ✅ تحديث `status` إلى ENUM

### 6. جداول جديدة ✅
- ✅ `store_users` - ربط الموظفين بالمتاجر
- ✅ `store_zones` - ربط المتاجر بالمناطق
- ✅ `customer_addresses` - عناوين العملاء
- ✅ `store_products` - بدلاً من store_inventory
- ✅ `order_status_history` - سجل حالات الطلب
- ✅ `zones` - المناطق (مبسط)

### 7. جدول Products ✅
- ✅ إضافة `barcode` (UNIQUE)
- ✅ إضافة `brand` و `category`
- ✅ إضافة `unit`
- ✅ إضافة `is_active`

## 📝 الملفات المعدلة

1. **`backend/server.js`**
   - تحديث `initDb()` function
   - تحديث جميع CREATE TABLE statements
   - تحديث INSERT/UPDATE queries
   - إضافة migration logic

2. **`backend/migrations/0006_new_schema_migration.sql`**
   - PostgreSQL migration script

3. **`backend/migrations/0006_new_schema_migration_mysql.sql`**
   - MySQL migration script (Schema جديد كامل)

## ⚠️ ملاحظات مهمة

### Backward Compatibility
- الكود يحافظ على التوافق مع البيانات القديمة
- الحقول القديمة (`name`, `user_id`, `latitude/longitude`) لا تزال موجودة
- Migration scripts تحول البيانات تلقائياً

### Data Migration
- `name` → `full_name` (تلقائي)
- `user_id` → `customer_id` (في orders)
- `latitude/longitude` → `lat/lng` (في stores)
- `store_inventory` → `store_products` (إذا كان موجود)

### Breaking Changes
- جدول `drivers` الآن يستخدم `user_id` كـ primary key
- قد تحتاج تحديث queries التي تستخدم `drivers.id`

## 🔧 الخطوات التالية

### 1. تشغيل Migration
```bash
# Backup أولاً!
pg_dump -U your_user -d your_database > backup.sql

# تشغيل Migration
psql -U your_user -d your_database -f backend/migrations/0006_new_schema_migration.sql
```

### 2. تحديث API Endpoints
- ✅ تحديث `/api/orders` POST - مكتمل
- ⚠️ تحديث `/api/orders/:id` GET - يحتاج تحديث
- ⚠️ تحديث `/api/users` - يحتاج تحديث
- ⚠️ إضافة `/api/customer-addresses` - جديد
- ⚠️ إضافة `/api/order-status-history` - جديد

### 3. تحديث Frontend
- تحديث API calls لاستخدام الحقول الجديدة
- تحديث forms لإضافة `phone`, `full_name`
- تحديث order display لاستخدام `public_code`

## 📊 حالة التحديث

| المكون | الحالة | الملاحظات |
|--------|--------|-----------|
| Database Schema | ✅ مكتمل | جميع الجداول محدثة |
| Migration Scripts | ✅ مكتمل | PostgreSQL + MySQL |
| Backend Queries | ⚠️ جزئي | بعض queries تحتاج تحديث |
| API Endpoints | ⚠️ جزئي | بعض endpoints جديدة |
| Frontend | ⏳ لم يبدأ | يحتاج تحديث |

---

**تم التحديث:** 2025-01-24
