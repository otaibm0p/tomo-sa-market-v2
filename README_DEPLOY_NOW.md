# 🚀 نقل التحديثات إلى tomo-sa.com

## ✅ ما تم إعداده:

1. ✅ جميع ملفات Frontend محدثة (Dashboard, Marketing, Admin Panel)
2. ✅ ملف Backend محدث (Port 3000, Automation Settings)
3. ✅ ملفات الإعدادات محدثة (nginx.conf, ecosystem.config.js)
4. ✅ سكريبتات النقل جاهزة

## 📋 الملفات المطلوب رفعها:

```
frontend/dist/*          → /var/www/tomo-market/frontend/dist/
backend/server.js        → /var/www/tomo-market/backend/
nginx.conf              → /etc/nginx/sites-available/tomo-sa.com
ecosystem.config.js     → /var/www/tomo-market/
```

## 🎯 الطريقة الأسهل (FileZilla):

1. **تحميل FileZilla** (إذا لم يكن مثبتاً)
2. **الاتصال:**
   - Host: `138.68.245.29`
   - Username: `root`
   - Password: (كلمة مرور SSH)
   - Port: `22`

3. **رفع الملفات:**
   - اسحب `frontend/dist/*` إلى `/var/www/tomo-market/frontend/dist/`
   - اسحب `backend/server.js` إلى `/var/www/tomo-market/backend/`
   - اسحب `nginx.conf` إلى `/etc/nginx/sites-available/tomo-sa.com`
   - اسحب `ecosystem.config.js` إلى `/var/www/tomo-market/`

4. **إعادة تشغيل الخدمات (PuTTY أو SSH):**
   ```bash
   cd /var/www/tomo-market
   pm2 restart tomo-market-backend
   pm2 save
   nginx -t
   systemctl reload nginx
   ```

## 🔧 الطريقة البديلة (PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File deploy-simple.ps1
```

**ملاحظة:** سيطلب كلمة مرور SSH عدة مرات.

## 📖 ملفات التعليمات:

- `نقل_التحديثات_النهائي.txt` - دليل شامل بالعربية
- `DEPLOY_INSTRUCTIONS.md` - دليل بالإنجليزية
- `deploy-simple.ps1` - سكريبت PowerShell

## ✅ التحقق من النجاح:

بعد الانتهاء، تحقق من:
- https://tomo-sa.com
- https://tomo-sa.com/admin
- https://tomo-sa.com/admin/marketing

---

**ملاحظة:** جميع التحديثات جاهزة محلياً. تحتاج فقط إلى رفعها إلى الخادم.

