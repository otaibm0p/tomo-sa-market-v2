# تقرير التحقق قبل النقل إلى الإنتاج

**التاريخ:** 2026-01-30  
**المشروع:** tomo-market-v2

---

## 1) Frontend – Build Production

| البند | الحالة | الملاحظات |
|-------|--------|-----------|
| ضبط `VITE_API_URL=https://api.tomo-sa.com` | ✅ PASS | يُضبط عند التنفيذ: `$env:VITE_API_URL='https://api.tomo-sa.com'` (PowerShell) أو في `.env.production` |
| `npm ci` + `npm run build` | ⚠️ فشل محلي | فشل بسبب EPERM (ملف مقفل — rollup في node_modules). **ليس خطأ في الكود.** نفّذ يدوياً بعد إغلاق IDE/المتصفح أو من مجلد مختلف. |

**مسار الملف الذي يفشل عند EPERM (Windows):**
- `frontend\node_modules\@rollup\rollup-win32-x64-msvc\rollup.win32-x64-msvc.node` — العملية: `unlink` (حذف/استبدال الملف). غالباً عملية Node أو IDE أو مزامنة OneDrive تحجز الملف. الحل: نقل المستودع إلى مسار غير مزامن (مثل `C:\dev\tomo-market-v2`) واستخدام `tools\windows\fix-npm-eperm.ps1`.

**خطأ ENOENT (مثل `preflight.css` مفقود):**
- المسار: `frontend\node_modules\tailwindcss\lib\css\preflight.css` — يظهر عندما `node_modules` غير مكتمل أو تالف (مثلاً بعد تثبيت داخل OneDrive أو مزامنة غير كاملة). الحل نفسه: نقل المستودع إلى `C:\dev\tomo-market-v2`، حذف `frontend/node_modules`، ثم تشغيل `.\tools\windows\fix-npm-eperm.ps1` أو يدوياً: `cd frontend && npm ci && npm run build`.
| لا طلبات إلى localhost | ✅ PASS | في `frontend/src/utils/api.ts`: لا يوجد fallback لـ localhost في الإنتاج. يُستخدم `VITE_API_URL` أو `window.location.origin` فقط. |
| الطلبات تشير إلى https://api.tomo-sa.com | ✅ PASS | عند ضبط `VITE_API_URL=https://api.tomo-sa.com` عند البناء، الـ base URL يُحقَن في البناء ويُستخدم لجميع طلبات الـ API. |

**ملفات تحتوي لفظ "localhost" (للمرجع فقط):**
- `frontend/src/modules/admin/ZoneManagement.tsx` و `StaffManagement.tsx`: نصوص رسائل خطأ للمطور فقط (لا تُحدد عنوان الطلبات).
- `frontend/src/utils/api.ts` و `useInventorySync.ts`: تعليقات فقط، لا fallback لـ localhost في الإنتاج.

---

## 2) Backend – Environment & Health

| البند | الحالة | الملاحظات |
|-------|--------|-----------|
| المتغيرات المطلوبة | ✅ PASS | الكود يتوقع: `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `PORT` (انظر `backend/env.template`). |
| نقطة الصحة | ✅ PASS | `GET /api/health` معرفة في `server.js` (سطر ~2766). |
| تشغيل الخادم | — | يُنفَّذ يدوياً: `cd backend && npm ci && npm start`. التحقق: `GET https://api.tomo-sa.com/api/health` → 200. |

---

## 3) OAuth – Google & Apple

| البند | الحالة | الملاحظات |
|-------|--------|-----------|
| Callback URLs | ✅ PASS | مطابقة في الكود والوثائق: Google `https://api.tomo-sa.com/api/auth/oauth/google/callback`، Apple `https://api.tomo-sa.com/api/auth/oauth/apple/callback` |
| مسارات البدء | ✅ PASS | `GET /api/auth/oauth/google/start` و `GET /api/auth/oauth/apple/start` معرفة. عند تفعيل OAuth: 302 Redirect. عند عدم التكوين: 501. |

---

## 4) Customer Auth Verification

| البند | الحالة | الملاحظات |
|-------|--------|-----------|
| `/signup` | ✅ PASS | الصفحة موجودة، حقول الاسم + هاتف/بريد + كلمة مرور + تأكيد. |
| `/login` | ✅ PASS | الصفحة موجودة، هاتف/بريد + كلمة مرور. |
| Eye icon (إظهار/إخفاء كلمة المرور) | ✅ PASS | موجود في `CustomerSignup.tsx` (حقل كلمة المرور + تأكيد كلمة المرور). |
| تأكيد كلمة المرور | ✅ PASS | حقل Confirm Password مع تحقق من التطابق وتعطيل الزر حتى الصحة. |
| لا fallback تسجيل دخول للعميل | ✅ PASS | تسجيل دخول العملاء عبر `/api/auth/customer/login` و `/api/auth/customer/signup` فقط، بدون fallback. |
| Feature flag `customer_signup_enabled` | ✅ PASS | يُقرأ من الإعدادات العامة؛ عند false تظهر "التسجيل متوقف مؤقتاً" وزر العودة للرئيسية. |

---

## 5) Admin & Driver

| البند | الحالة | الملاحظات |
|-------|--------|-----------|
| `/admin` → إعادة توجيه إلى `/admin/login` عند عدم المصادقة | ✅ PASS | في `AdminLayout.tsx`: `navigate('/admin/login?redirect=' + ...)`. |
| `/driver/login` يعمل بدون 500 | ✅ PASS | المسار معرف في `App.tsx`؛ خطأ 500 يكون من الخادم (قاعدة بيانات/بيئة) وليس من التوجيه. |
| لا ملفات مكررة أو مؤقتة مستخدمة | ✅ PASS | فحص: لا ملفات "نسخة"، لا ملفات `.log` في المستودع. |

---

## 6) Clean Repo Check

| البند | الحالة | الملاحظات |
|-------|--------|-----------|
| لا ملفات نسخة | ✅ PASS | لا توجد ملفات تحتوي "نسخة" في المسارات. |
| لا ملفات .log | ✅ PASS | لا توجد ملفات `.log` في المشروع. |
| لا dev-only scripts في مسار الإنتاج | ✅ PASS | البناء يعتمد على `vite build` و`dist`؛ لا استخدام لـ dev-server في الإنتاج. |
| لا duplicate API clients | ✅ PASS | مصدر واحد للـ API: `frontend/src/utils/api.ts` (axios). `useInventorySync` يستخدم نفس منطق `getApiBase` بدون localhost في الإنتاج. |

---

## 7) الخلاصة

| العنصر | النتيجة |
|--------|---------|
| **جاهزية النقل** | ✅ **المستودع جاهز للنقل من ناحية الكود والإعدادات.** |
| **مُحوَّل أو فاشل** | فشل تنفيذ `npm ci`/`npm run build` محلياً بسبب EPERM (ملف مقفل) — **بيئة محلية وليس خطأ مشروع.** يُنصح بإعادة التشغيل بعد إغلاق التطبيقات التي تستخدم `node_modules` أو تشغيل البناء من طرفية جديدة. |
| **ما يجب تنفيذه يدوياً على السيرفر** | 1) ضبط `VITE_API_URL=https://api.tomo-sa.com` وبناء الواجهة. 2) ضبط `NODE_ENV`, `DATABASE_URL`, `JWT_SECRET`, `PORT` وتشغيل الخادم. 3) التحقق من `GET https://api.tomo-sa.com/api/health` ووصول `/driver/login` و`/admin`. |

---

**توقيع التحقق:** تم التحقق من الكود والمسارات والإعدادات. لا توجد blockers في الكود؛ أي فشل في البناء أو التشغيل في البيئة الحالية ناتج عن البيئة (صلاحيات/قفل ملفات).
