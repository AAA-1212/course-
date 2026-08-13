# مركز القمة كلاسك — منشئ كورسات التمرين

تطبيق ويب للمدرب لإعداد كورسات التمارين وتصديرها PDF/صورة، مع سوبر ست ومكتبة وتمارين وسجل.

## التشغيل المحلي

```bash
npm install
npm run dev
```

## المزامنة بين الأجهزة + الرفع على Google

البيانات المشتركة (المكتبة / السجل / رمز الحماية) تتم عبر **Firebase (Google)**.

اتبع الدليل الكامل بالعربي:

- [DEPLOY-FIREBASE-AR.md](./DEPLOY-FIREBASE-AR.md)

باختصار:

1. أنشئ مشروع Firebase وفعّل Anonymous Auth + Firestore + Hosting
2. انسخ المفاتيح إلى ملف `.env` من `.env.example`
3. نفّذ:

```bash
firebase login
firebase deploy --only firestore:rules
npm run deploy
```

بعدها الرابط الرسمي يفتح من أي جهاز، والتعديلات تظهر للبقية مباشرة.
