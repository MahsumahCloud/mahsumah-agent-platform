# النشر على محسومة كلاود

المنصة تطبيق Next.js يحتاج **عملية دائمة وقرصاً دائماً** (SQLite + ملفات المعرفة)، لذلك يُنشر كحاوية Docker وليس كموقع serverless.

## 1) إعداد المشروع في البوابة (Deploy from GitHub)

| الحقل | القيمة |
|---|---|
| Repository | `MahsumahCloud/mahsuma-agent-platform`، الفرع `main` |
| Framework | Next.js، Root directory `./` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Start command | `npm run start:cloud` |

`start:cloud` يشغّل الترحيل والتهيئة (idempotent) ثم `next start` على `0.0.0.0:$PORT`. البوابة تبني داخل المملكة؛ ملف `Dockerfile` في المستودع بديل لأي استضافة تعتمد الحاويات.

## 2) القرص الدائم

القرص مثبّت تلقائياً على `/data`. وجّه قاعدة البيانات والرفع إليه عبر المتغيرين `DATABASE_PATH` و`UPLOAD_DIR` (الجدول أدناه)، وإلا تُمسح المعرفة والمحادثات مع كل نشر.

## 3) متغيرات البيئة (تبويب Environment)

| المتغير | القيمة |
|---|---|
| `LLM_PROVIDER` | `anthropic` |
| `ANTHROPIC_API_KEY` | مفتاح بحساب خدمة، بلا تاريخ انتهاء |
| `ANTHROPIC_MODEL` | `claude-opus-5` (أو `claude-sonnet-5` لتكلفة أقل) |
| `EMBEDDING_PROVIDER` | `voyage` أو `openai` (المحلي للتطوير فقط) |
| `VOYAGE_API_KEY` / `OPENAI_API_KEY` | حسب المزوّد |
| `ADMIN_PASSWORD` | كلمة مرور قوية للوحة التحكم |
| `SESSION_SECRET` | 32+ حرفاً عشوائياً (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_APP_URL` | `https://agent.mahsumaah.sa` |
| `DATABASE_PATH` | `/data/agent.db` |
| `UPLOAD_DIR` | `/data/uploads` |
| `NODE_ENV` | `production` |

## 4) النطاق

أضف `agent.mahsumaah.sa` من Domains؛ SSL يُصدر تلقائياً. هذا هو الرابط الذي تستخدمه المواقع في `widget.js` وفي `/api/v1/agent/chat`.

## 5) بعد أول نشر

1. ادخل اللوحة، أعد رفع المعرفة إن كانت الـ embeddings محلية سابقاً (تغيير مزوّد الـ embeddings يستلزم إعادة الفهرسة).
2. في كل منتج → الصلاحيات والثقة: أدخل نطاقات المواقع المسموح لها بوضع الزائر.
3. أنشئ مفاتيح API لكل منتج من "الربط والتضمين" واحفظها في باك-إند المنتج المضيف.

## التشغيل محلياً بالحاوية

```bash
docker build -t mahsuma-agent .
docker run -p 3000:3000 -v $(pwd)/data:/data --env-file .env mahsuma-agent
```

## الباقة المناسبة

- **Free (256 MB)**: للتجربة الأولى فقط؛ بناء Next قد يحتاج ذاكرة أكثر وقت التشغيل ضيق.
- **Starter (512 MB)** كحد أدنى للإنتاج الفعلي، و**Pro (1 GB)** إذا رُفعت وثائق كثيرة أو زاد عدد المواقع المضمّنة.

## ملاحظات التوسع

- نسخة واحدة تكفي لآلاف المحادثات يومياً. عند الحاجة لأكثر من replica: انقل SQLite إلى PostgreSQL + pgvector (راجع `docs/ARCHITECTURE.md`) وحد الطلبات إلى Redis.
- راقب `usage` في المحادثات لضبط التكلفة؛ prompt caching مفعّل على طبقة النظام.
