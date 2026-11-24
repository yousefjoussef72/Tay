# مساحة — موقع تأسيسي

نسخة أولية لموقع عربي باتجاه RTL، مبنية باستخدام React وVite، مع قاعدة بيانات PostgreSQL عبر Supabase.

## ما الموجود الآن؟

- صفحة رئيسية متجاوبة باللغة العربية.
- أقسام تعريفية ومميزات ونموذج تواصل.
- صفحة `/admin` لتسجيل الدخول وإدارة المقالات والرسائل.
- قاعدة بيانات Supabase مُنشأة ومفعّلة.
- مخطط قاعدة بيانات موثق في مجلد `supabase/migrations`.
- نشر أولي على Vercel.

> الاسم والنصوص الحالية مؤقتة. سنحدد هوية الموقع ومجاله ومحتواه في المرحلة التالية.

## التشغيل محليًا

1. ثبّت Node.js.
2. نفّذ `npm install`.
3. انسخ `.env.example` إلى `.env.local`.
4. أضف عنوان مشروع Supabase ومفتاحه العام إلى متغيري البيئة:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. نفّذ `npm run dev`.

## قاعدة البيانات

مشروع Supabase الحالي اسمه `tay-space` والمنطقة هي Frankfurt (EU Central). تم تطبيق المخطط بالفعل؛ الملف `supabase/migrations/202611240001_initial_schema.sql` يوثق الجداول والسياسات المطبقة.

الجداول:
- `profiles`: بيانات الحسابات وأدوارها.
- `categories`: تصنيفات المحتوى.
- `articles`: المقالات والمسودات.
- `messages`: رسائل نموذج التواصل.
- `site_settings`: إعدادات الموقع.

سياسات RLS مفعلة على كل الجداول. مفتاح `publishable` مخصص للاستخدام في المتصفح؛ لا تضع مفتاح `service_role` أو أي مفتاح سري في الواجهة الأمامية أو مستودع GitHub.

## تفعيل حساب الإدارة

1. أنشئ مستخدمًا من Authentication في لوحة Supabase.
2. سيُنشأ له سجل في جدول `profiles` بدور `member`.
3. من SQL Editor، عيّن حسابك مديرًا باستخدام بريدك:

```sql
update public.profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'YOUR_EMAIL@example.com'
);
```

4. افتح `/admin` وسجّل الدخول بالبريد وكلمة المرور.

## النشر

الموقع منشور على Vercel. متغيرا البيئة السابقان موجودان على بيئات Production وPreview وDevelopment. أمر البناء هو `npm run build` ومجلد الناتج `dist`.

