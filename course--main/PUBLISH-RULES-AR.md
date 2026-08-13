# انشر قواعد Firestore الآن (مطلوب)

الاختبار أثبت:
- `.env` صحيح
- Anonymous Auth يشتغل
- الكتابة على Firestore **مرفوضة** لأن قواعد المشروع ما زالت Production الافتراضية

## الخطوات (دقيقة واحدة)

1. افتح: https://console.firebase.google.com/project/gymcourse/firestore/rules
2. امسح القواعد القديمة بالكامل
3. الصق هذا النص:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /shared/{docId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

4. اضغط **Publish**
5. أخبرني بعد النشر حتى أعيد اختبار الحفظ والقراءة
