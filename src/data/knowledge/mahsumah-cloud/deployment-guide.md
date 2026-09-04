# دليل النشر على محسومة كلاود

## نشر تطبيق Next.js

1. اربط حسابك على GitHub أو GitLab من الإعدادات > Git.
2. اختر المستودع ثم الفرع الرئيسي (main).
3. المنصة تكتشف Next.js تلقائياً وتضبط أمر البناء `next build`.
4. أضف متغيرات البيئة من تبويب Environment (مثل DATABASE_URL و NEXTAUTH_SECRET).
5. اضغط "نشر". كل push لاحق على الفرع ينشئ نشراً جديداً، وكل فرع آخر ينشئ بيئة Preview.

## نشر تطبيق Node.js

1. تأكد من وجود سكربت `start` في package.json.
2. حدد المنفذ من متغير البيئة PORT (المنصة تمرره تلقائياً).
3. اختر إصدار Node من ملف `.nvmrc` أو حقل engines.
4. اضغط نشر وتابع السجلات من تبويب Logs.

## نشر حاوية Docker

1. أضف Dockerfile في جذر المستودع.
2. المنصة تبني الصورة داخل المملكة ولا تستخدم سجلات خارجية.
3. حدد المنفذ المكشوف عبر EXPOSE.
4. الحد الأقصى لحجم الصورة 2 GB في باقات النمو والأعمال.

## الأطر المدعومة

Next.js، React (Vite)، Nuxt، SvelteKit، Node.js، المواقع الثابتة (HTML/CSS)، وحاويات Docker. لا يتم دعم PHP أو Python كخدمات مباشرة حالياً إلا عبر Docker.

## الأخطاء الشائعة

- "Build failed: missing environment variable": أضف المتغير من تبويب Environment ثم أعد النشر.
- "Port not detected": تأكد أن التطبيق يستمع على process.env.PORT.
- "Image too large": قلّل حجم الصورة باستخدام multi-stage build.
