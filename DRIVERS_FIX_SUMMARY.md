# ✅ تقرير إصلاح جدول Drivers

**التاريخ:** 2025-01-24

---

## 🔍 المشكلة المكتشفة

تم اكتشاف خطأ محتمل في تعريف FOREIGN KEY في جدول `drivers` حيث قد يكون تم استخدام العمود `user_change` بدلاً من `user_id`.

---

## ✅ ما تم إنجازه

### 1. إنشاء Migration تصحيحية ✅

تم إنشاء ملفين migration:

#### PostgreSQL
- **الملف:** `backend/migrations/0007_fix_drivers_foreign_key.sql`
- **الوظيفة:**
  - التحقق من وجود الجدول وإنشاؤه إذا لم يكن موجودًا
  - إسقاط أي FOREIGN KEY خاطئ يستخدم `user_change`
  - التأكد أن `user_id` هو PRIMARY KEY
  - إضافة FOREIGN KEY الصحيح: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  - التحقق النهائي من البنية

#### MySQL
- **الملف:** `backend/migrations/0007_fix_drivers_foreign_key_mysql.sql`
- **الوظيفة:** نفس الوظيفة ولكن بصيغة MySQL

### 2. تصحيح المراجع في `backend/server.js` ✅

تم تصحيح جميع المراجع من `drivers(id)` إلى `drivers(user_id)` في:

1. ✅ `order_tracking_history.driver_id`
2. ✅ `orders.driver_id`
3. ✅ `order_dispatch_attempts.courier_id`
4. ✅ `courier_stats.courier_id`
5. ✅ `driver_ratings.driver_id`
6. ✅ `driver_notifications.driver_id`
7. ✅ `courier_wallets.driver_id`
8. ✅ `driver_zones.driver_id`

### 3. التأكد من البنية الصحيحة ✅

- ✅ `user_id` هو PRIMARY KEY في جدول `drivers`
- ✅ FOREIGN KEY صحيح: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
- ✅ جميع الجداول الأخرى تشير إلى `drivers(user_id)` وليس `drivers(id)`

---

## 📁 الملفات المعدلة

1. ✅ `backend/migrations/0007_fix_drivers_foreign_key.sql` (جديد)
2. ✅ `backend/migrations/0007_fix_drivers_foreign_key_mysql.sql` (جديد)
3. ✅ `backend/migrations/README_DRIVERS_FIX.md` (جديد - دليل الاستخدام)
4. ✅ `backend/server.js` (محدث - تصحيح المراجع)

---

## 🚀 كيفية التشغيل محليًا

### PostgreSQL

```bash
# الانتقال إلى مجلد المشروع
cd backend

# تشغيل المايجريشن
psql -U your_username -d your_database_name -f migrations/0007_fix_drivers_foreign_key.sql
```

**مثال:**
```bash
psql -U postgres -d tomo_market -f migrations/0007_fix_drivers_foreign_key.sql
```

### MySQL

```bash
# الانتقال إلى مجلد المشروع
cd backend

# تشغيل المايجريشن
mysql -u your_username -p your_database_name < migrations/0007_fix_drivers_foreign_key_mysql.sql
```

**مثال:**
```bash
mysql -u root -p tomo_market < migrations/0007_fix_drivers_foreign_key_mysql.sql
```

---

## ⚠️ تحذيرات مهمة

1. **Backup أولاً!**
   ```bash
   # PostgreSQL
   pg_dump -U your_user -d your_database > backup_before_drivers_fix.sql
   
   # MySQL
   mysqldump -u your_user -p your_database > backup_before_drivers_fix.sql
   ```

2. **اختبار على بيئة التطوير أولاً**

3. **التحقق من البيانات**
   - تأكد أن جميع السجلات في `drivers` لها `user_id` صحيح
   - تأكد أن `user_id` يشير إلى سجلات موجودة في `users`

---

## ✅ التحقق من النتيجة

### PostgreSQL

```sql
-- التحقق من PRIMARY KEY
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'drivers'::regclass
  AND contype = 'p';

-- التحقق من FOREIGN KEY
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'drivers'::regclass
  AND contype = 'f'
  AND confrelid = 'users'::regclass;
```

### MySQL

```sql
-- التحقق من PRIMARY KEY و FOREIGN KEY
SELECT 
  CONSTRAINT_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'drivers'
  AND (CONSTRAINT_NAME = 'PRIMARY' OR REFERENCED_TABLE_NAME = 'users');
```

---

## 📋 النتيجة المتوقعة

بعد تشغيل المايجريشن بنجاح:

1. ✅ `user_id` هو PRIMARY KEY في جدول `drivers`
2. ✅ FOREIGN KEY موجود: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
3. ✅ لا يوجد أي قيد يستخدم `user_change`
4. ✅ جميع الجداول الأخرى تشير إلى `drivers(user_id)` بشكل صحيح

---

## 📚 الملفات المرجعية

- `backend/migrations/README_DRIVERS_FIX.md` - دليل تفصيلي للاستخدام
- `backend/migrations/0007_fix_drivers_foreign_key.sql` - Migration PostgreSQL
- `backend/migrations/0007_fix_drivers_foreign_key_mysql.sql` - Migration MySQL

---

**تم الإصلاح:** 2025-01-24  
**الحالة:** ✅ جاهز للتشغيل محليًا
