export type Locale = 'ar' | 'en'

const defaultLocale: Locale = 'ar'

let currentLocale: Locale = defaultLocale

export function getLocale(): Locale {
  return currentLocale
}

export function setLocale(loc: Locale): void {
  currentLocale = loc
}

export function isRTL(): boolean {
  return currentLocale === 'ar'
}

const strings: Record<Locale, Record<string, string>> = {
  ar: {
    login: 'تسجيل الدخول',
    phone: 'رقم الجوال',
    password: 'كلمة المرور',
    showPassword: 'إظهار',
    hidePassword: 'إخفاء',
    loginError: 'رقم الجوال أو كلمة المرور غير صحيحة',
    loading: 'جاري التحميل...',
    home: 'الرئيسية',
    order: 'الطلب',
    profile: 'الحساب',
    online: 'متصل',
    offline: 'غير متصل',
    available: 'متاح',
    busy: 'مشغول',
    lastSeen: 'آخر ظهور',
    connectionOk: 'متصل',
    connectionFail: 'لا يوجد اتصال',
    noActiveOrder: 'لا يوجد طلب نشط',
    activeOrder: 'الطلب النشط',
    pickedUp: 'تم الاستلام',
    delivering: 'قيد التوصيل',
    delivered: 'تم التوصيل',
    updateStatus: 'تحديث الحالة',
    driverInfo: 'معلومات المندوب',
    logout: 'تسجيل الخروج',
    name: 'الاسم',
    email: 'البريد',
    phoneLabel: 'الهاتف',
    locationPermissionDenied: 'يجب السماح بالموقع لتفعيل التوصيل. يرجى تفعيل الموقع من الإعدادات.',
    lastLocationSent: 'آخر إرسال موقع',
  },
  en: {
    login: 'Login',
    phone: 'Phone',
    password: 'Password',
    showPassword: 'Show',
    hidePassword: 'Hide',
    loginError: 'Invalid phone or password',
    loading: 'Loading...',
    home: 'Home',
    order: 'Order',
    profile: 'Profile',
    online: 'Online',
    offline: 'Offline',
    available: 'Available',
    busy: 'Busy',
    lastSeen: 'Last seen',
    connectionOk: 'Connected',
    connectionFail: 'No connection',
    noActiveOrder: 'No active order',
    activeOrder: 'Active order',
    pickedUp: 'Picked up',
    delivering: 'Delivering',
    delivered: 'Delivered',
    updateStatus: 'Update status',
    driverInfo: 'Driver info',
    logout: 'Log out',
    name: 'Name',
    email: 'Email',
    phoneLabel: 'Phone',
    locationPermissionDenied: 'Location permission is required to track deliveries. Please enable in Settings.',
    lastLocationSent: 'Last location sent',
  },
}

export function t(key: string): string {
  return strings[currentLocale]?.[key] ?? strings.en[key] ?? key
}
