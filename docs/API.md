# REST API

Base: `/api/v1`. الاستجابات JSON. الأخطاء بالشكل `{ "error": { "code", "message", "details?" } }`.

## المصادقة

| نوع | كيف | يُستخدم في |
|---|---|---|
| مفتاح منتج (خادم ↔ خادم) | `Authorization: Bearer mak_…` أو `X-API-Key`؛ الجسم يحدد `tenantId/userId/role` | `/agent/chat` |
| رمز مستخدم موقّع (متصفح) | `Authorization: Bearer mat_…` مولَّد في باك-إند المنتج؛ الهوية من الرمز | `/agent/chat` |
| جلسة المشرف | cookie بعد `POST /admin/login` | كل مسارات الإدارة و`/agent/chat` من اللوحة |
| عام | — | `/widget-config`, `/widget.js` |

## POST /agent/chat

```json
{
  "productId": "mahsuma-cloud",
  "tenantId": "company_123",
  "userId": "user_456",
  "role": "customer_admin",
  "message": "ما هي أفضل باقة لموقعي؟",
  "conversationId": "optional — لإكمال محادثة",
  "locale": "ar | en (اختياري، يُكتشف تلقائياً)",
  "pageContext": { "path": "/dashboard/projects", "projectType": "nextjs" },
  "metadata": { "userName": "أحمد", "source": "dashboard" }
}
```

الاستجابة:

```json
{
  "conversationId": "…",
  "messageId": "…",
  "answer": "الباقة الأنسب لك غالباً هي **النمو** …",
  "confidence": 0.82,
  "sources": [{ "sourceId": "…", "chunkId": "…", "title": "الفوترة والاشتراكات › الترقية", "type": "markdown", "excerpt": "…", "score": 0.41 }],
  "suggestedActions": [{ "type": "upgrade_plan", "label": "عرض باقة النمو", "payload": { "planId": "growth" } }],
  "handoffRequired": false,
  "toolCalls": [{ "toolId": "suggest_plan", "input": { "needs": "…" }, "output": { "recommendations": [] }, "durationMs": 3 }],
  "locale": "ar",
  "usage": { "inputTokens": 0, "outputTokens": 0, "model": "mock-grounded-v1" }
}
```

`suggestedActions[].type` ∈ `open_ticket | navigate | upgrade_plan | view_docs | contact_sales | run_tool`.

الأدوار: `visitor | customer | customer_admin | developer | support_agent | owner`. دور غير معروف يُعامل كـ `visitor`.

مع مفتاح `mak_` تكون `tenantId/userId/role` إلزامية في الجسم. مع رمز `mat_` تُتجاهل وتؤخذ من الرمز.

الأخطاء: `401` بيانات اعتماد ناقصة/غير صالحة/منتهية، `403` دور غير مسموح أو مفتاح/رمز لمنتج آخر أو الوكيل معطّل، `404` منتج غير موجود، `429` تجاوز الحد (30/دقيقة لكل رمز مستخدم، 300/دقيقة لكل مفتاح+IP).

## الإدارة (جلسة المشرف)

| Method | Path | الوصف |
|---|---|---|
| POST | `/admin/login` `{password}` | إنشاء الجلسة |
| POST | `/admin/logout` | إنهاء الجلسة |
| GET | `/products` | قائمة المنتجات |
| POST | `/products` (ProductProfile) | إنشاء منتج + مفتاح API (يُرجع `apiKey` مرة واحدة) |
| GET/PATCH/DELETE | `/products/{id}` | قراءة/تعديل جزئي/حذف |
| GET/POST/DELETE | `/products/{id}/api-keys` | قائمة/إنشاء `{label}`/إلغاء `{keyId}` |
| GET | `/products/{id}/knowledge` | المصادر؛ مع `?q=` بحث دلالي تجريبي |
| POST | `/products/{id}/knowledge` | multipart `file` (+`title`) أو JSON `{type:"markdown"\|"text", title, text}` أو `{type:"url", url, title?}` |
| GET/DELETE | `/knowledge/{sourceId}` | مصدر واحد |
| GET | `/products/{id}/conversations?lowConfidence=1` | المحادثات |
| GET | `/conversations/{id}` | محادثة كاملة |
| GET | `/products/{id}/low-confidence` | إجابات تحت حد الثقة مع سؤالها |
| GET | `/products/{id}/analytics` | عدّادات |
| GET | `/tools` | الأدوات ومخططات JSON Schema |
| GET | `/widget-config?productId=` | عام: اسم/ترحيب/ألوان |

## أمثلة

```bash
# محادثة
curl -s -X POST http://localhost:3000/api/v1/agent/chat \
  -H "Authorization: Bearer $MAHSUMA_CLOUD_KEY" -H "Content-Type: application/json" \
  -d '{"productId":"mahsuma-cloud","tenantId":"company_123","userId":"user_456","role":"developer","message":"كيف أنشر تطبيق Next.js؟"}'

# رفع PDF (بعد تسجيل الدخول وحفظ الكوكي)
curl -s -c c.txt -X POST http://localhost:3000/api/v1/admin/login -H "Content-Type: application/json" -d '{"password":"change-me"}'
curl -s -b c.txt -F file=@docs.pdf -F title="دليل المستخدم" http://localhost:3000/api/v1/products/mahsuma-cloud/knowledge

# إضافة رابط
curl -s -b c.txt -X POST http://localhost:3000/api/v1/products/mahsuma-dcc/knowledge \
  -H "Content-Type: application/json" -d '{"type":"url","url":"https://dcc.mahsumaah.sa/docs/kpis"}'
```
