# دليل تشغيل التطبيق على جهاز iPhone

## ✅ الإعدادات الحالية (تم إصلاحها):
- ✅ CODE_SIGN_STYLE = Automatic
- ✅ CODE_SIGN_IDENTITY = "Apple Development"
- ✅ DEVELOPMENT_TEAM = 85V7NA4A54
- ✅ PRODUCT_BUNDLE_IDENTIFIER = com.tomo.tomocustomerapp

---

## 📱 خطوات تشغيل التطبيق على جهازك:

### 1️⃣ **توصيل جهاز iPhone**

1. وصّل جهاز iPhone بجهاز Mac عبر USB
2. افتح **Settings** على iPhone
3. اذهب إلى **General > VPN & Device Management**
4. إذا ظهر حساب Apple Developer، اضغط **Trust** (إذا لم تكن موثوقاً)

---

### 2️⃣ **فتح المشروع في Xcode**

```bash
افتح: tomocustomerapp.xcodeproj
```

---

### 3️⃣ **إعداد Signing & Capabilities**

**في Xcode:**

1. اختر المشروع من Navigator (أيقونة الملف الأزرق في الأعلى)
2. اختر Target: **tomocustomerapp**
3. اذهب إلى تبويب **Signing & Capabilities**

**الإعدادات المطلوبة:**
- ✅ فعّل **"Automatically manage signing"**
- اختر **Team** من القائمة المنسدلة: **85V7NA4A54**
- تأكد أن **Bundle Identifier** = `com.tomo.tomocustomerapp`

**إذا ظهرت رسالة خطأ:**
- "No signing certificate found" → تأكد من تسجيل الدخول في Xcode
- "Bundle Identifier already exists" → غيّره إلى `com.tomo.tomocustomerapp.dev`

---

### 4️⃣ **اختيار جهازك من القائمة**

**في شريط الأدوات (Toolbar) في Xcode:**

1. اضغط على قائمة الأجهزة (بجانب زر Run)
2. اختر **جهاز iPhone الخاص بك** (سيظهر اسمه)
   - مثال: "iPhone 15 Pro" أو "user294169's iPhone"
3. **لا** تختار Simulator

---

### 5️⃣ **تشغيل التطبيق**

**طريقة 1: من القائمة**
- **Product** > **Run** (أو اضغط `⌘R`)

**طريقة 2: من شريط الأدوات**
- اضغط زر **▶️ Run** (في الأعلى)

---

### 6️⃣ **الموافقة على الثقة (Trust) - أول مرة فقط**

**على جهاز iPhone:**

1. عند أول تشغيل، ستظهر رسالة: **"Untrusted Developer"**
2. اذهب إلى: **Settings > General > VPN & Device Management**
3. اضغط على حساب Apple Developer الخاص بك
4. اضغط **"Trust [Your Name]"**
5. اضغط **"Trust"** مرة أخرى للتأكيد
6. ارجع إلى التطبيق واضغط على أيقونته لتشغيله

---

## ⚠️ حل المشاكل الشائعة:

### ❌ **"Signing for 'tomocustomerapp' requires a development team"**

**الحل:**
1. Xcode > Settings > Accounts
2. اضغط **+** لإضافة Apple ID
3. سجّل دخول بحساب Apple Developer
4. ارجع إلى Signing & Capabilities
5. اختر Team من القائمة

---

### ❌ **"No signing certificate found"**

**الحل:**
1. Xcode > Settings > Accounts
2. اختر حسابك
3. اضغط **"Download Manual Profiles"**
4. أو فعّل "Automatically manage signing" في Signing & Capabilities

---

### ❌ **"Bundle Identifier is not available"**

**الحل:**
1. في Signing & Capabilities
2. غيّر Bundle Identifier إلى:
   - `com.tomo.tomocustomerapp.dev`
   - أو `com.yourname.tomocustomerapp`

---

### ❌ **"Device not trusted"**

**الحل:**
1. على iPhone: Settings > General > VPN & Device Management
2. اضغط على حساب Developer
3. اضغط **"Trust"**

---

### ❌ **"Provisioning profile not found"**

**الحل:**
- مع Automatic Signing، Xcode ينشئها تلقائياً
- تأكد من تفعيل "Automatically manage signing"
- تأكد من تسجيل الدخول بحساب Apple Developer في Xcode

---

## 📋 Checklist قبل التشغيل:

- [ ] جهاز iPhone موصول بجهاز Mac
- [ ] Xcode مفتوح والمشروع محمّل
- [ ] تسجيل الدخول بحساب Apple Developer في Xcode
- [ ] "Automatically manage signing" مفعّل
- [ ] Team محدد (85V7NA4A54)
- [ ] جهاز iPhone مختار من قائمة الأجهزة
- [ ] جهاز iPhone موثوق به (Trust)

---

## 🎯 بعد التشغيل الناجح:

- ✅ التطبيق سيعمل على جهازك مباشرة
- ✅ يمكنك اختبار جميع الميزات
- ✅ التغييرات في الكود ستظهر بعد إعادة البناء

---

## 📝 ملاحظات:

- **لا تحتاج Archive** لتشغيل التطبيق على جهازك
- Archive مطلوب فقط للرفع على TestFlight أو App Store
- للتشغيل على الجهاز، استخدم **Run** مباشرة

---

**تم إعداد المشروع بنجاح! جاهز للتشغيل على جهازك.** ✅
