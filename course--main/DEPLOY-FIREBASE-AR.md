# رفع الموقع على Google Firebase (رسمي + مزامنة بين الأجهزة)

هذا الدليل يخلي عندك:
- رابط رسمي من Google (`https://your-project.web.app`)
- فتح من الحاسوب والجوال وأي جهاز
- المكتبة / السجل / رمز الحماية تتحدث بين كل الأجهزة فوراً

## 1) أنشئ مشروع Firebase (خطة Blaze المدفوعة حسب الاستخدام)

1. ادخل: [https://console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** واختر اسم المشروع (مثلاً `top-classic-course`)
3. فعّل Google Analytics إذا تحب (اختياري)
4. من القائمة اليسرى:
   - **Build → Authentication → Get started → Sign-in method → Anonymous → Enable**
   - **Build → Firestore Database → Create database → Start in production mode** (ثم نرفع القواعد)
   - **Build → Hosting → Get started**

> خطة **Spark** المجانية تكفي للتجربة غالباً.  
> خطة **Blaze** (Pay as you go) هي الخيار الرسمي المدفوع عند نمو الاستخدام.

## 2) أضف تطبيق ويب وانسخ المفاتيح

1. Project Overview → **Add app → Web (`</>`)**
2. سجّل اسم التطبيق
3. انسخ قيم `firebaseConfig`

## 3) جهّز ملف البيئة في المشروع

في مجلد `course--main` أنشئ ملف `.env` (انسخ من `.env.example`):

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

عدّل أيضاً `.firebaserc` وضع `projectId` الحقيقي بدل `REPLACE_WITH_FIREBASE_PROJECT_ID`.

## 4) ثبّت أدوات Firebase وارفع القواعد + الموقع

من مجلد المشروع:

```bash
npm install
npm install -g firebase-tools
firebase login
firebase use your_project_id
firebase deploy --only firestore:rules
npm run build
firebase deploy --only hosting
```

بعد النجاح يعطيك رابط مثل:

`https://your_project_id.web.app`

## 5) اختبر المزامنة

1. افتح الرابط على الحاسوب
2. أضف تمرين من تبويب المكتبة
3. افتح نفس الرابط على الجوال
4. لازم يظهر التمرين الجديد بدون إعادة رفع

في تبويب **الحماية** لازم تشوف: **متصل بالسحابة**.

## ملاحظات مهمة

- البيانات المشتركة حالياً: المكتبة، الأقسام، السجل، رمز الحماية.
- مسودة اللاعب الحالية (الاسم/الوزن) تبقى محلية عمداً حتى ما تختلط بين الأجهزة أثناء الكتابة.
- لا ترفع ملف `.env` إلى GitHub.
- إذا ظهرت «محلي فقط»: ملف `.env` ناقص أو خطأ بالمفاتيح.
- إذا ظهرت «خطأ بالاتصال»: تأكد أن Anonymous Auth وFirestore Rules مرفوعة.
