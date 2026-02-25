# ربط المشروع بـ GitHub ورفع الكود (Push)

## ما تم تنفيذه محلياً

- ✅ المستودع المحلي موجود مسبقاً (لم نُنشئ `git init` لأنه كان موجوداً).
- ✅ تمت إضافة جميع الملفات: `git add .`
- ✅ تم إنشاء Commit برسالة: **Initial commit** (116 ملفاً).

---

## الخطوات في متصفح GitHub لربط المستودع ورفع الكود

### الخيار أ: استخدام مستودع GitHub **موجود** (مثل tomo-sa-market-v2)

المشروع مرتبط مسبقاً بـ:
- **Remote:** `origin` → `https://github.com/otaibm0p/tomo-sa-market-v2.git`
- **الفرع الحالي:** `home-ui-arabic`

**ما تفعله:**

1. افتح المتصفح وادخل إلى: **https://github.com/otaibm0p/tomo-sa-market-v2**
2. سجّل الدخول إلى حسابك إن لم تكن مسجلاً.
3. على جهازك (Terminal)، نفّذ من مجلد المشروع:
   ```bash
   cd /Users/user294169/Desktop/tomo-ios-new/tomocustomerapp
   git push -u origin home-ui-arabic
   ```
4. إذا طُلب منك اسم المستخدم وكلمة المرور:
   - **اسم المستخدم:** حساب GitHub (مثل `otaibm0p`)
   - **كلمة المرور:** استخدم **Personal Access Token (PAT)** وليس كلمة مرور الحساب.  
     لإنشاء Token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token (مع صلاحية `repo`).

بعد نجاح `git push` سيظهر الفرع `home-ui-arabic` والـ commit الجديد على GitHub.

---

### الخيار ب: إنشاء مستودع GitHub **جديد** ورفع المشروع إليه

1. **إنشاء المستودع على GitHub**
   - ادخل إلى: **https://github.com/new**
   - **Repository name:** مثلاً `tomocustomerapp` أو أي اسم تفضله.
   - **Public** أو **Private** حسب رغبتك.
   - **لا** تضف README أو .gitignore أو License (المشروع لديك محلياً بالفعل).
   - اضغط **Create repository**.

2. **ربط المستودع المحلي بالمستودع الجديد**
   - بعد إنشاء المستودع، ستظهر صفحة بها أوامر جاهزة.
   - إذا أردت استبدال الـ remote الحالي (`origin`) بالمستودع الجديد، نفّذ (غيّر `YOUR_USERNAME` و `NEW_REPO_NAME` حسب المستودع الجديد):
     ```bash
     cd /Users/user294169/Desktop/tomo-ios-new/tomocustomerapp
     git remote set-url origin https://github.com/YOUR_USERNAME/NEW_REPO_NAME.git
     ```
   - أو إضافة remote ثانٍ بدون حذف الحالي:
     ```bash
     git remote add github https://github.com/YOUR_USERNAME/NEW_REPO_NAME.git
     ```

3. **رفع الكود (Push)**
   - للرفع إلى `origin` (بعد تغيير الرابط أعلاه):
     ```bash
     git push -u origin home-ui-arabic
     ```
   - أو للرفع إلى الـ remote الجديد المسمّى `github`:
     ```bash
     git push -u github home-ui-arabic
     ```

4. **تعيين الفرع الافتراضي على GitHub (اختياري)**
   - في صفحة المستودع: **Settings** → **Branches** → Default branch → اختر `home-ui-arabic` ثم **Update**.

---

## ملخص أوامر سريعة (بعد الربط)

| المهمة              | الأمر |
|---------------------|--------|
| رفع الفرع الحالي    | `git push -u origin home-ui-arabic` |
| عرض الـ remotes     | `git remote -v` |
| تغيير رابط origin   | `git remote set-url origin https://github.com/USER/REPO.git` |

---

## إذا ظهر خطأ مصادقة (Authentication)

- استخدم **Personal Access Token** بدلاً من كلمة مرور GitHub.
- أو استخدم **SSH:** أنشئ مفتاح SSH واربطه بحسابك، ثم استخدم عنوان المستودع بصيغة `git@github.com:USER/REPO.git` بدلاً من `https://...`.
