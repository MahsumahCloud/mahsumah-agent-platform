# سياسة الأمان

- أبلغ عن الثغرات عبر البريد security@mahsuma.sa (حدّثه قبل النشر) بدل فتح issue عام.
- نطاق الاهتمام: عزل الشركات (tenant isolation)، تجاوز RBAC، تسريب مفاتيح، حقن البرمبت الذي يكسر الحواجز، SSRF في استيراد الروابط.
- لا تنشر مفاتيح `mak_` في المتصفح أو المستودعات؛ استخدم رموز `mat_` الموقّعة (راجع `docs/INTEGRATION.md`).
- في الإنتاج: `SESSION_SECRET` إلزامي، وضع الخدمة خلف HTTPS، وقيّد `Access-Control-Allow-Origin` لنطاقاتك في `next.config.ts` و`src/app/api/v1/agent/chat/route.ts`.
