#!/bin/bash
# شغّل هذا الملف على جهاز الـ cloud لرفع الفرع home-ui-arabic إلى GitHub
# طريقة التشغيل: bash push-home-ui-arabic.sh
# أو: sh push-home-ui-arabic.sh

cd "$(dirname "$0")"
git push -u origin home-ui-arabic
