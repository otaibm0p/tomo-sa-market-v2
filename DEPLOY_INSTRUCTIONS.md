# تعليمات نقل التحديثات إلى tomo-sa.com

## الملفات المطلوب رفعها:

1. **Frontend** - جميع ملفات `frontend/dist/`
2. **Backend** - `backend/server.js`
3. **Config Files** - `nginx.conf` و `ecosystem.config.js`

## الخطوات:

### الطريقة 1: استخدام SCP (يدوياً)

افتح PowerShell في مجلد المشروع واتبع الخطوات التالية:

#### 1. رفع Frontend:
```powershell
cd frontend\dist
scp -r * root@138.68.245.29:/var/www/tomo-market/frontend/dist/
```
(سيطلب كلمة مرور SSH - أدخلها)

#### 2. رفع Backend:
```powershell
cd ..\..
scp backend\server.js root@138.68.245.29:/var/www/tomo-market/backend/
```

#### 3. رفع ملفات الإعدادات:
```powershell
scp nginx.conf root@138.68.245.29:/etc/nginx/sites-available/tomo-sa.com
scp ecosystem.config.js root@138.68.245.29:/var/www/tomo-market/
```

#### 4. إعادة تشغيل الخدمات:
```powershell
ssh root@138.68.245.29 "cd /var/www/tomo-market && pm2 restart tomo-market-backend && pm2 save"
ssh root@138.68.245.29 "nginx -t && systemctl reload nginx"
```

### الطريقة 2: استخدام FileZilla أو WinSCP

1. افتح FileZilla أو WinSCP
2. اتصل بالخادم:
   - Host: `138.68.245.29`
   - Username: `root`
   - Password: (كلمة مرور SSH)
   - Port: `22`

3. ارفع الملفات:
   - من `frontend/dist/*` إلى `/var/www/tomo-market/frontend/dist/`
   - من `backend/server.js` إلى `/var/www/tomo-market/backend/`
   - من `nginx.conf` إلى `/etc/nginx/sites-available/tomo-sa.com`
   - من `ecosystem.config.js` إلى `/var/www/tomo-market/`

4. بعد الرفع، افتح SSH terminal واكتب:
```bash
cd /var/www/tomo-market
pm2 restart tomo-market-backend
pm2 save
nginx -t && systemctl reload nginx
```

### الطريقة 3: استخدام السكريبت (deploy-now.ps1)

```powershell
powershell -ExecutionPolicy Bypass -File deploy-now.ps1
```

**ملاحظة:** سيطلب منك إدخال كلمة مرور SSH عدة مرات.

## التحقق من النجاح:

بعد الانتهاء، تحقق من:
- https://tomo-sa.com
- https://tomo-sa.com/admin
- https://tomo-sa.com/admin/marketing

## في حالة وجود مشاكل:

1. تحقق من حالة PM2:
```bash
ssh root@138.68.245.29 "pm2 status"
```

2. تحقق من سجلات PM2:
```bash
ssh root@138.68.245.29 "pm2 logs tomo-market-backend --lines 50"
```

3. تحقق من Nginx:
```bash
ssh root@138.68.245.29 "nginx -t"
```

4. تحقق من أن البورت 3000 يعمل:
```bash
ssh root@138.68.245.29 "netstat -tulpn | grep 3000"
```

