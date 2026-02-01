# 🔧 إصلاح جدول Drivers - Foreign Key

## المشكلة
تم اكتشاف خطأ محتمل في تعريف FOREIGN KEY في جدول `drivers` حيث قد يكون تم استخدام العمود `user_change` بدلاً من `user_id`.

## الحل
تم إنشاء ملفات Migration تصحيحية:
- `0007_fix_drivers_foreign_key.sql` (PostgreSQL)
- `0007_fix_drivers_foreign_key_mysql.sql` (MySQL)

## ما تقوم به المايجريشن

### 1. التحقق من وجود الجدول
- إذا لم يكن موجودًا، يتم إنشاؤه بالبنية الصحيحة

### 2. إسقاط القيود الخاطئة
- البحث عن أي FOREIGN KEY يستخدم `user_change`
- إسقاطه إذا كان موجودًا

### 3. التأكد من PRIMARY KEY
- التأكد أن `user_id` هو PRIMARY KEY
- إزالة أي PRIMARY KEY قديم على `id` إذا كان موجودًا

### 4. إضافة FOREIGN KEY الصحيح
- إضافة `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

### 5. التحقق النهائي
- عرض معلومات القيود للتأكد من صحتها

---

## ⚠️ تنبيهات مهمة

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

## 🚀 تشغيل المايجريشن محليًا

### PostgreSQL

```bash
# الانتقال إلى مجلد المشروع
cd backend

# تشغيل المايجريشن
psql -U your_username -d your_database_name -f migrations/0007_fix_drivers_foreign_key.sql

# أو مع كلمة المرور
PGPASSWORD=your_password psql -U your_username -d your_database_name -f migrations/0007_fix_drivers_foreign_key.sql
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

# أو بدون كلمة مرور (غير آمن)
mysql -u your_username your_database_name < migrations/0007_fix_drivers_foreign_key_mysql.sql
```

**مثال:**
```bash
mysql -u root -p tomo_market < migrations/0007_fix_drivers_foreign_key_mysql.sql
```

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

بعد تشغيل المايجريشن بنجاح، يجب أن يكون:

1. ✅ `user_id` هو PRIMARY KEY في جدول `drivers`
2. ✅ FOREIGN KEY موجود: `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
3. ✅ لا يوجد أي قيد يستخدم `user_change`

---

## 🐛 في حالة وجود أخطاء

### خطأ: "column user_id does not exist"
- الجدول قديم جدًا ولا يحتوي على `user_id`
- يجب تشغيل migration سابقة أولاً

### خطأ: "foreign key constraint violation"
- قد تكون هناك بيانات غير صحيحة
- تحقق من أن جميع `user_id` في `drivers` موجودة في `users`

### خطأ: "cannot drop primary key"
- قد تكون هناك جداول أخرى تعتمد على PRIMARY KEY القديم
- يجب تحديث تلك الجداول أولاً

---

## 📞 الدعم

إذا واجهت أي مشاكل، راجع:
- ملفات المايجريشن نفسها (تحتوي على تعليقات مفصلة)
- سجلات قاعدة البيانات
- ملف `SCHEMA_MIGRATION_GUIDE.md`

---

**تاريخ الإنشاء:** 2025-01-24
