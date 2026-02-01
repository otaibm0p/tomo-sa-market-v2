# Deploy Header and Footer with White Background

## المشكلة:
SSH config يحتوي على خطأ. يجب نقل الملفات يدوياً أو إصلاح SSH config.

## الحل السريع:

### 1. نقل الملفات:
استخدم FileZilla أو WinSCP لنقل:
- `frontend/src/components/Header.tsx`
- `frontend/src/components/Footer.tsx`

إلى:
- `/var/www/tomo-app/frontend/src/components/`

### 2. على السيرفر:
```bash
cd /var/www/tomo-app/frontend
npm run build
chmod -R 755 dist
chown -R www-data:www-data dist
systemctl reload nginx
```

## التغييرات:
- ✅ Header: `bg-white` (أبيض)
- ✅ Footer: `bg-white` مع `text-gray-800` (أبيض مع نص رمادي)
- ✅ "تسوق حسب الفئة" موجود في `homeLayout.json`

