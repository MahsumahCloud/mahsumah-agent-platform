# المساهمة في منصة وكلاء محسومة

شكراً لاهتمامك. المشروع مفتوح المصدر بترخيص MIT، ويهدف لأن يكون بوابة مساعد ذكي قابلة للتضمين في أي منتج SaaS عربي.

## التشغيل للتطوير

```bash
npm install
cp .env.example .env
npm run db:migrate && npm run db:seed && npm run build:widget
npm run dev
```

لا تحتاج أي مفتاح API: المزوّد الافتراضي `mock` والـ embeddings محلية. قبل فتح Pull Request:

```bash
npm run typecheck && npm test && npm run smoke
```

## أين تضيف ماذا

| تريد | المكان |
|---|---|
| مزوّد LLM جديد | `src/lib/llm/<provider>.ts` يطبّق `LlmProvider`، وسجّله في `src/lib/llm/index.ts` |
| مزوّد embeddings | `src/lib/rag/embeddings.ts` |
| مخزن متجهات (pgvector, Qdrant…) | صنف يطبّق `VectorStore` في `src/lib/rag/vector-store.ts` |
| أداة جديدة للوكيل | `src/lib/tools/definitions/*.ts` عبر `registerTool` (Zod in/out + permissions) |
| نوع مصدر معرفة | `src/lib/rag/loaders/` |
| صفحة في لوحة التحكم | `src/app/(dashboard)/` |
| طبقة برمبت | `src/data/prompts/` و`src/lib/agent/prompt-builder.ts` |

## قواعد

- TypeScript صارم بلا `any`. الأدوات لا تصل لبيانات tenant آخر أبداً.
- كل تغيير في السلوك يرافقه اختبار في `tests/`.
- لا تضع مفاتيح أو بيانات عملاء في الكود أو الـ seed؛ `.env` مُتجاهَل في git.
- الرسائل الظاهرة للمستخدم بالعربية أولاً مع مقابل إنجليزي حيث يلزم.

## الإبلاغ عن ثغرات

راجع `SECURITY.md`. لا تفتح issue عاماً لثغرة أمنية.
