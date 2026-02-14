# إعدادات TestFlight - دليل خطوة بخطوة

## الإعدادات الحالية في المشروع:
- ✅ CODE_SIGN_STYLE = Automatic (مفعّل)
- ✅ PRODUCT_BUNDLE_IDENTIFIER = com.tomo.tomocustomerapp
- ✅ TARGETED_DEVICE_FAMILY = "1,2" (iPhone & iPad)

## خطوات الإعداد في Xcode (macincloud):

### 1. فتح المشروع
```
افتح tomocustomerapp.xcodeproj في Xcode
```

### 2. إعداد Signing & Capabilities

**في Xcode:**
1. اختر المشروع من Navigator (أيقونة الملف الأزرق في الأعلى)
2. اختر Target: **tomocustomerapp**
3. اذهب إلى تبويب **Signing & Capabilities**

**الإعدادات المطلوبة:**
- ✅ فعّل **"Automatically manage signing"**
- اختر **Team** من القائمة المنسدلة (Apple Developer Team)
- تأكد أن **Bundle Identifier** = `com.tomo.tomocustomerapp`
- إذا ظهرت رسالة "Bundle Identifier is not available"، غيّره إلى:
  - `com.tomo.tomocustomerapp.dev` أو
  - `com.yourcompany.tomocustomerapp` (استبدل yourcompany باسمك)

### 3. اختيار Device للبناء

**في شريط الأدوات:**
- اختر **"Any iOS Device (arm64)"** من قائمة الأجهزة
- **لا** تختار Simulator

### 4. بناء Archive

**من القائمة:**
1. **Product** > **Scheme** > **tomocustomerapp**
2. **Product** > **Archive**
3. انتظر حتى يكتمل البناء

### 5. رفع إلى App Store Connect

**بعد اكتمال Archive:**
1. ستفتح نافذة **Organizer**
2. اختر Archive الذي تم إنشاؤه
3. اضغط **"Distribute App"**
4. اختر **"App Store Connect"**
5. اضغط **"Upload"**
6. اتبع الخطوات:
   - اختر **"Automatically manage signing"**
   - راجع الخيارات واضغط **"Upload"**
   - انتظر اكتمال الرفع

## المتطلبات الأساسية:

### ⚠️ تحتاج إلى:

1. **Apple Developer Account**
   - اشتراك سنوي: $99/سنة
   - الوصول: https://developer.apple.com

2. **App Store Connect Setup**
   - سجل دخول إلى: https://appstoreconnect.apple.com
   - أنشئ App جديد:
     - Bundle ID: `com.tomo.tomocustomerapp`
     - App Name: "Tomo Market" (أو أي اسم تريده)
     - Primary Language: English
   - املأ معلومات التطبيق الأساسية

3. **Apple Developer Team**
   - Team ID (سيظهر في Xcode عند تسجيل الدخول)
   - Certificates & Profiles (سيتم إنشاؤها تلقائياً مع Automatic Signing)

## ملاحظات مهمة:

- ✅ **CODE_SIGN_STYLE = Automatic** موجود بالفعل في المشروع
- ✅ **Bundle Identifier** موجود: `com.tomo.tomocustomerapp`
- ⚠️ تحتاج إلى إضافة **DEVELOPMENT_TEAM** في Xcode (لا يمكن إضافته يدوياً بدون Team ID)

## إذا واجهت مشاكل:

1. **"No signing certificate found"**
   - تأكد من تسجيل الدخول بحساب Apple Developer في Xcode
   - Xcode > Settings > Accounts > أضف Apple ID

2. **"Bundle Identifier already exists"**
   - غيّر Bundle Identifier إلى قيمة فريدة
   - مثال: `com.tomo.tomocustomerapp.v1`

3. **"Provisioning profile not found"**
   - مع Automatic Signing، Xcode ينشئها تلقائياً
   - تأكد من تفعيل "Automatically manage signing"
