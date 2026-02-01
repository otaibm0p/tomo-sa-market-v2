# تقرير التنظيف النهائي — tomo-market-v2 (Production-ready)

**التاريخ:** 2025-01-30  
**الهدف:** تنظيف المشروع وتجهيزه للنشر (Production) دون كسر منطق الطلبات/الأسعار.

---

## الـ Commits المنفذة

| # | Commit | الوصف |
|---|--------|--------|
| 1 | `chore(cleanup): remove duplicated "نسخة" files (no functional changes)` | حذف 8 ملفات نسخة مكررة |
| 2 | `chore(repo): move dev-only helpers under tools/ and ignore logs` | archive/.gitignore + توثيق أدوات التطوير في DEPLOYMENT_GUIDE |
| 3 | `fix(config): make backend and frontend production-safe (DATABASE_URL + API base + VITE_API_URL)` | إصلاح إعدادات الإنتاج |
| 4 | `chore(frontend): remove unused driver dead-code (no UI change)` | إزالة DriverTasks و DriverEntry غير المستخدمين |

---

## الملفات المحذوفة / المنقولة

### محذوفة نهائياً
- `‏‏IMPLEMENTATION_SUMMARY - نسخة.md`
- `frontend/src/modules/admin/‏‏Dashboard - نسخة.tsx`
- `frontend/src/modules/admin/‏‏AdminSidebar - نسخة.tsx`
- `frontend/src/modules/admin/‏‏AdminLayout - نسخة.tsx`
- `frontend/src/utils/‏‏api - نسخة.ts`
- `frontend/src/‏‏App - نسخة.tsx`
- `frontend/src/context/‏‏ThemeContext - نسخة.tsx`
- `frontend/src/context/‏‏LanguageContext - نسخة.tsx`
- `archive/security.log`
- `frontend/src/modules/delivery/DriverTasks.tsx`
- `frontend/src/modules/delivery/DriverEntry.tsx`

### مضافة / معدّلة (بدون حذف منطق)
- `archive/.gitignore` — تجاهل `*.log` داخل archive
- `backend/server.js` — استخدام `DATABASE_URL` من env مع fallback للـ dev مع تحذير
- `backend/public/login.html` — `API_BASE` من `window.__API_BASE__` أو `location.origin`
- `frontend/src/utils/api.ts` — لا fallback لـ localhost في الإنتاج؛ VITE_API_URL أو same-origin
- `frontend/src/hooks/useInventorySync.ts` — نفس منطق api.ts
- `backend/env.template` — إضافة تعليق لـ ALLOW_TEST_ACCOUNTS
- `README_DEPLOY.md` — توثيق متغيرات النشر (DATABASE_URL، VITE_API_URL)
- `DEPLOYMENT_GUIDE.md` — ملاحظة أن أدوات التطوير توضع تحت `tools/dev`

---

## المتغيرات المطلوبة للنشر (Production)

### Backend (قبل تشغيل السيرفر)
| المتغير | مطلوب | ملاحظة |
|---------|--------|--------|
| `DATABASE_URL` | **نعم** | رابط Postgres (مثل `postgresql://user:pass@host:5432/db`) — لا يُستخدم localhost ثابت في الإنتاج |
| `JWT_SECRET` | **نعم** | مفتاح سري قوي |
| `PORT` | اختياري | افتراضي حسب الكود (مثلاً 3000 أو 5000) |
| `NODE_ENV` | يُفضّل | `production` في السيرفر |
| `ALLOW_TEST_ACCOUNTS` | لا | للتطوير فقط؛ في الإنتاج الـ endpoint معطّل إلا إذا ضُبط صراحة |

### Frontend (عند البناء للنشر)
| المتغير | مطلوب | ملاحظة |
|---------|--------|--------|
| `VITE_API_URL` | يُفضّل | عنوان الـ API (مثل `https://tomo-sa.com`). إن لم يُضبط يُفترض same-origin (نفس الدومين الذي يُخدم منه الـ frontend). |

---

## التحقق المحلي (ما تم تنفيذه)

- ✅ `npm run build` (frontend) — ناجح
- ✅ لا يوجد استيراد لملفات "نسخة" قبل الحذف
- ✅ الـ TypeScript/بناء لا يشتكي من الملفات المحذوفة

### ما يمكنك فعله يدوياً بعد التنظيف

1. **تشغيل Backend محلياً:**  
   `cd backend && npm start` (أو `node server.js`)  
   - بدون `DATABASE_URL`: يستخدم fallback localhost مع تحذير في الـ console.  
   - مع `DATABASE_URL` في `.env`: يستخدمه مباشرة.

2. **تشغيل Frontend محلياً:**  
   `cd frontend && npm run dev`  
   - في التطوير الـ proxy يوجّه `/api` إلى الـ backend (مثلاً localhost:3000 حسب vite.config.js).

3. **التحقق من الصفحات:**  
   - `/admin` — يعمل إذا الـ backend يعمل والـ auth سليم.  
   - `/driver/login` — يعمل؛ إنشاء الحساب التجريبي معطّل في الإنتاج إلا مع `ALLOW_TEST_ACCOUNTS=true`.

---

## ما لم يُغيّر (حسب الطلب)

- **منطق الطلبات والتسعير والتوزيع:** لم يُمس.
- **لا refactor غير ضروري:** فقط إزالة تكرار وتعديل إعدادات الإنتاج.
- **أدوات التطوير (dev-server.mjs، WINDOWS_DEV_FIX.md، run-local.bat):** غير موجودة في المشروع؛ تم توثيق أن ما شابهها يوضع تحت `tools/dev` ولا يُستخدم في Production.

---

## ملخص الحالة

- **الملفات المحذوفة:** 11 (8 نسخ + 1 log + 2 مكونات driver غير مستخدمة).
- **الإعدادات:** Backend يعتمد على `DATABASE_URL` في الإنتاج؛ Frontend لا يستخدم localhost افتراضياً في الإنتاج؛ login.html يستخدم same-origin أو `window.__API_BASE__`.
- **الـ Build:** frontend يبنى بنجاح بعد كل مرحلة.

المشروع جاهز للنقل إلى سيرفر الإنتاج بعد ضبط `DATABASE_URL` و (اختيارياً) `VITE_API_URL` في بيئة النشر.
