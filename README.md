# 🔴 REDroid — APK Reverse Engineering Tools

> أقوى مرجع لأدوات الهندسة العكسية على أندرويد

## التحميل
انتقل إلى [Releases](https://github.com/alhsryahmd266-jpg/redroid-apk/releases) وحمّل آخر APK.

## الميزات
- 14 أداة هندسة عكسية عالمية مع أوامر تفصيلية
- 10 تقنيات خطوة بخطوة
- مرجع أوامر مع نسخ بلمسة واحدة
- تصميم سايبرسيكيوريتي احترافي

## البناء محلياً
1. ثبّت [Expo CLI](https://docs.expo.dev/get-started/installation/)
2. `cd artifacts/mobile && npm install`
3. `npx expo prebuild --platform android`
4. `cd android && ./gradlew assembleRelease`

## إعداد GitHub Secrets للتوقيع
1. شغّل `./generate-keystore.sh`
2. أضف هذه Secrets في إعدادات الـ Repository:
   - `KEYSTORE_BASE64`: الناتج من base64
   - `KEY_ALIAS`: `redroid-key`
   - `KEY_PASSWORD`: `redroid2024`
   - `STORE_PASSWORD`: `redroid2024`

## الـ CI/CD
كل push على main → بناء APK تلقائي
كل tag (v1.0.0) → نشر Release مع APK موقّع
