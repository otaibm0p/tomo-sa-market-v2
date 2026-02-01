# إنشاء حسابات المديرين (Super Admin + Admin)

يُنشئ السكربت **مرة واحدة** المستخدمين التاليين في قاعدة البيانات:

| البريد (للتسجيل)       | الاسم        | الدور        |
|------------------------|-------------|--------------|
| `super-admin@tomo.com` | Super Admin | super_admin  |
| `admin@tomo.com`       | Admin       | admin        |

**كلمة المرور** لكليهما: تُعيّن من متغير البيئة `TOMO_ADMIN_PASSWORD` (مثال: `Tomo.2439`).

## المتطلبات

1. تشغيل **PostgreSQL**.
2. وجود ملف **`.env`** في مجلد `backend` مع `DATABASE_URL` صحيح (أو استخدام القيمة الافتراضية للتطوير).

## التشغيل

### Windows (PowerShell)

```powershell
cd backend
$env:TOMO_ADMIN_PASSWORD="Tomo.2439"
node seed-admin-users.js
```

### Windows (CMD)

```cmd
cd backend
set TOMO_ADMIN_PASSWORD=Tomo.2439
node seed-admin-users.js
```

### Linux / Mac

```bash
cd backend
TOMO_ADMIN_PASSWORD=Tomo.2439 node seed-admin-users.js
```

بعد النجاح، سجّل الدخول من **/admin/login** بأي من البريدين وكلمة المرور التي حددتها.

**ملاحظة أمنية:** لا تضف كلمة المرور في الكود. استخدم متغير البيئة فقط، ولا ترفع ملف `.env` إلى Git.
