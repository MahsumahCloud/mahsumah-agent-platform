# ربط الوكيل داخل منتجك

## 1) الطريقة الموصى بها: عبر الباك-إند

منتجك يعرف من هو المستخدم وما شركته وصلاحياته. مرّر ذلك من خادمك مع مفتاح المنتج:

```ts
// في API route داخل منتجك (Next.js/Express/…)
const res = await fetch(`${AGENT_URL}/api/v1/agent/chat`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${process.env.MAHSUMAH_AGENT_KEY}` },
  body: JSON.stringify({ productId: "mahsumah-cloud", tenantId: session.orgId, userId: session.userId, role: session.role, message, conversationId, pageContext: { path } }),
});
```

ثم اعرض `answer` و`suggestedActions` في واجهتك، أو استخدم الويدجت مع `data-base-url` يشير إلى proxy في منتجك (بدون `data-api-key`).

## 1.5) الموقع العام: زوار بلا تسجيل ثم ترقية بعد الدخول

الوضع المعتاد في مواقع محسومة: الزائر يسأل عن المنتج قبل التسجيل، وبعد الدخول يصبح عميلاً بصلاحيات أوسع.

1. في لوحة التحكم → إعداد الوكيل → الصلاحيات والثقة: فعّل "السماح للزوار غير المسجلين" وأضف نطاقات موقعك (`https://mahsumaah.sa`). القائمة الفارغة تسمح لأي نطاق وهي للتطوير فقط.
2. للزائر: ضع الويدجت بدون `data-user-token`. الخادم يفرض دور `visitor` دائماً (لا أدوات حساب، لا فوترة، لا تذاكر) داخل tenant مشترك اسمه `anonymous`، ويحدّ الطلبات لكل زائر/IP.
3. بعد تسجيل الدخول: أعد تحميل الويدجت مع `data-user-token` من الباك-إند فيرتفع الدور والصلاحيات تلقائياً، وتبدأ محادثة جديدة مرتبطة بحساب العميل.

```html
<!-- قبل التسجيل -->
<script src="https://agent.mahsumaah.sa/widget.js" data-product-id="mahsumah-cloud" data-locale="ar"></script>
<!-- بعد التسجيل -->
<script src="https://agent.mahsumaah.sa/widget.js" data-product-id="mahsumah-cloud" data-user-token="mat_..." data-locale="ar"></script>
```

## 2) الويدجت من المتصفح — برمز مستخدم موقّع

مفتاح المنتج (`mak_…`) لا يُوضع في أي صفحة. بدلاً منه يولّد خادمك رمزاً قصير العمر يربط الشركة والمستخدم والدور، موقّعاً بمفتاح المنتج:

```ts
// backend (Node) — انسخ الدالة من src/lib/tenancy/user-token.ts أو نفّذ نفس المواصفة
import { signUserToken } from "./user-token";
const token = signUserToken(
  { productId: "mahsumah-cloud", tenantId: org.id, userId: user.id, role: user.role, name: user.name, locale: "ar", ttlSeconds: 900 },
  process.env.MAHSUMAH_AGENT_KEY,
);
```

المواصفة: `mat_<base64url(payload)>.<base64url(HMAC-SHA256(key = sha256(apiKey), payload))>` حيث payload يحوي `productId, tenantId, userId, role, name?, locale?, kid (أول 16 حرفاً من المفتاح), exp (unix seconds)`. المنصة تتحقق من التوقيع بالـ hash المخزّن، ومن الصلاحية، ومن انتماء المفتاح للمنتج، وترفض المفاتيح الملغاة.

```html
<script src="https://agent.example.com/widget.js"
  data-product-id="mahsumah-cloud"
  data-user-token="mat_..."
  data-locale="ar"
  data-user-name="أحمد"
  data-page-context='{"path":"/dashboard/projects","projectType":"nextjs"}'>
</script>
```

- الهوية تأتي من الرمز فقط؛ أي `tenantId/userId/role` في الطلب تُتجاهل.
- جدّد الرمز مع كل تحميل صفحة (TTL 15 دقيقة افتراضياً). عند انتهائه يعرض الويدجت رسالة خطأ ويكفي إعادة تحميل الصفحة.
- للتجربة المحلية: `npm run token -- mahsumah-cloud mak_… company_123 user_456 customer_admin`.
- الحد 30 طلب/دقيقة لكل مفتاح+مستخدم موقّع، و300/دقيقة لكل مفتاح+IP للاستدعاءات من الخادم.

جميع خصائص `data-*`: `product-id` (إلزامي)، `user-token`، `locale` (ar/en)، `base-url`، `user-name`، `page-context` (JSON)، `primary-color`، `title`، `position` (bottom-right/bottom-left). خصائص `tenant-id/user-id/role` تُستخدم فقط في وضع الجلسة نفس-الأصل (لوحة التحكم/الديمو).

الويدجت يطلق حدثاً على `window` عند ضغط إجراء مقترح:

```js
window.addEventListener("mahsumah-agent:action", (e) => {
  const action = e.detail; // { type: "upgrade_plan", label, payload: { planId } }
  if (action.type === "upgrade_plan") router.push(`/billing?plan=${action.payload.planId}`);
});
```

## 3) React

انسخ `src/widgets/react/AgentWidget.tsx` (أو انشره كحزمة داخلية):

```tsx
<AgentWidget productId="mahsumah-dcc" userToken={token} locale="ar" baseUrl={process.env.NEXT_PUBLIC_AGENT_URL} pageContext={{ path: pathname }} />
```

## 4) ما يجب أن يمرّره المنتج

| الحقل | لماذا |
|---|---|
| `productId` | يختار الوكيل والمعرفة والأدوات |
| `tenantId` + `userId` | عزل المحادثات وبيانات الحساب في الأدوات (من الجسم مع مفتاح الخادم، أو من الرمز الموقّع) |
| `role` | يحدد الأدوات المتاحة ونبرة الشرح (تقني/أعمال) |
| `pageContext` | يجعل الاقتراحات مرتبطة بالصفحة (مثلاً خطوة النشر التالية) |
| `conversationId` | لإكمال نفس المحادثة (يُرجعه أول رد) |
