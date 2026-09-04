# منصة وكلاء محسومة — Mahsuma Agent Platform

منصة **AI Agent** متعددة المنتجات، قابلة للتضمين داخل أي منتج SaaS أو لوحة تحكم أو موقع. كل منتج له وكيل مستقل (معرفة + أدوات + شخصية + صلاحيات) فوق نفس المحرك.

- **Core Agent Engine**: RAG + Tool calling + Guardrails + Confidence + تسجيل المحادثات.
- **Product Profiles**: ملف تعريف مستقل لكل منتج (نبرة، باقات، أسئلة شائعة، سياسات، أدوات، أدوار).
- **Knowledge Base**: PDF / Markdown / روابط / نص → chunks → embeddings → بحث هجين (دلالي + لفظي) معزول لكل منتج.
- **Prompt System**: طبقات (منصة، منتج، دور، أمان، أدوات، تنسيق، معرفة، سياق) تُركَّب ديناميكياً.
- **Tool Registry**: 10 أدوات بمخططات Zod وصلاحيات، تُفعَّل لكل منتج.
- **Multi-tenant + RBAC**: مفاتيح API لكل منتج، Tenant/User/Role في كل طلب، عزل المحادثات والمعرفة.
- **Dashboard** عربي: المنتجات، إعداد الوكيل، المعرفة، الأدوات، Playground، المحادثات والتحليلات، الربط.
- **Embedded Widget**: `widget.js` بدون اعتماديات + مكوّن React، RTL/LTR، ألوان وشعار لكل منتج.
- **LLM Provider Adapter**: Anthropic (افتراضي للإنتاج) / OpenAI / Mock (يعمل بدون مفاتيح).

يعمل محلياً بالكامل بدون أي مفتاح API (مزوّد `mock` + embeddings محلية) ويتحول للإنتاج بتغيير متغيرات البيئة فقط.

---

## طبقتان من المعرفة: المؤسسة ثم المنتج

نفس المحرك يعمل كبوابة في كل مواقع وتطبيقات محسومة. لكي يعرف كل وكيل العائلة كاملة ويبقى متخصصاً في منتجه:

| الطبقة | المكان | من يراها |
|---|---|---|
| **معرفة المؤسسة** (تعريف محسومة، دليل المنتجات، القيم، قنوات التواصل، الشعار الافتراضي) | لوحة التحكم → "معرفة المؤسسة المشتركة" (`mahsuma-org`) | كل الوكلاء |
| **معرفة المنتج** (وثائق، باقات، أسئلة شائعة، سياسات، أدوات) | لوحة التحكم → المنتج | وكيل ذلك المنتج فقط |

البحث الدلالي يستعلم عن نطاقي المعرفة معاً، والبرمبت يحتوي طبقة مؤسسة تُدرج دليل المنتجات تلقائياً، فإذا سُئل وكيل كلاود عن DCC أجاب باختصار من المعرفة المشتركة ثم وجّه العميل لمساعد DCC. المنتجات المضمّنة: `mahsuma` (الموقع الرئيسي/خدمة العملاء العامة)، `mahsuma-cloud`، `mahsuma-dcc`، و`mahsuma-moto` كقالب معطّل حتى تُكمل بياناته.

## الشعار والهوية

- شعار المؤسسة: ضع الملف في `public/brand/` (الافتراضي `public/brand/mahsuma-logo.svg`، استبدله بشعارك) وأشر إليه من صفحة المؤسسة.
- شعار لكل منتج: إعداد الوكيل → الشخصية → "شعار المنتج"؛ إن تُرك فارغاً يُستخدم شعار المؤسسة.
- الويدجت يعرض الشعار واللون والاسم تلقائياً من `GET /api/v1/widget-config`.

## المصدر المفتوح

الترخيص MIT (`LICENSE`). دليل المساهمة في `CONTRIBUTING.md` وسياسة الأمان في `SECURITY.md`. لا تحوي الشجرة أي أسرار: `.env` متجاهَل، والمفاتيح تُخزَّن كـ hash فقط.

## التشغيل محلياً

```bash
npm install
cp .env.example .env        # عدّل ADMIN_PASSWORD و SESSION_SECRET
npm run db:migrate
npm run db:seed             # يحمّل محسومة كلاود + محسومة DCC + المعرفة + مفاتيح API (تُطبع مرة واحدة)
npm run build:widget        # يبني public/widget.js
npm run dev                 # http://localhost:3000
```

- لوحة التحكم: `http://localhost:3000` (كلمة المرور من `ADMIN_PASSWORD`).
- صفحة عرض الويدجت: `http://localhost:3000/demo?productId=mahsuma-cloud`.
- الاختبارات: `npm test` · تجربة المحرك من الطرفية: `npm run smoke` · الفحص: `npm run typecheck` · الإنتاج: `npm run build && npm start`.

> **Node 20+**. المشروع مثبّت على `better-sqlite3@11` لأن الإصدار 13 يتعطل على Node 22.12 في macOS. قاعدة البيانات في `data/agent.db`.

### التحويل إلى Anthropic في الإنتاج

```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5
EMBEDDING_PROVIDER=voyage   # أو openai — embeddings حقيقية متعددة اللغات
VOYAGE_API_KEY=...
```

بعد تغيير مزوّد الـ embeddings أعد فهرسة المعرفة (`npm run db:reset` أو احذف المصادر وأعد رفعها) لأن المتجهات مرتبطة بالنموذج.

---

## هيكل الملفات

```
src/
  app/                      Next.js App Router
    (dashboard)/            لوحة التحكم (محمية بجلسة المشرف)
      page.tsx              قائمة المنتجات والوكلاء
      products/new/         إضافة منتج
      products/[id]/        playground | settings | knowledge | tools | conversations | integrate
    api/v1/
      agent/chat/           POST — نقطة الدخول العامة للوكيل (API key)
      products/…            CRUD المنتجات، مفاتيح API، المعرفة، المحادثات، التحليلات
      knowledge/[id]/       حذف/قراءة مصدر معرفة
      conversations/[id]/   عرض محادثة
      tools/                قائمة الأدوات ومخططاتها
      widget-config/        إعدادات عامة للويدجت (اسم/ترحيب/ألوان)
      admin/login|logout    جلسة المشرف
    demo/                   صفحة مضيف تجريبية للويدجت
    login/
  components/
    dashboard/              Playground, SettingsForm, KnowledgeManager, ToolsManager, ApiKeysPanel, Sidebar
    ui/                     PageHeader, EmptyState, ErrorState, Spinner, StatCard, ConfidenceBadge
  lib/
    agent/                  engine.ts (المحرك), prompt-builder.ts, guardrails.ts, confidence.ts, conversations.ts
    llm/                    index.ts (factory), anthropic.ts, openai.ts, mock.ts
    rag/                    chunker.ts, embeddings.ts, vector-store.ts, retriever.ts, ingest.ts, loaders/
    tools/                  registry.ts + definitions/{account,product,support}.ts
    tenancy/                api-keys.ts, context.ts (Principal)
    auth/                   rbac.ts, admin-session.ts
    products/               repository.ts, schema.ts (Zod)
    api/                    responses.ts, auth.ts, rate-limit.ts
  data/
    products/               ملفات تعريف المنتجات التجريبية (seed)
    prompts/                system.md, safety.md, tool-use.md, formatting.md, roles/*.md
    knowledge/<productId>/  وثائق Markdown تُفهرس عند الـ seed
  db/                       schema.ts (Drizzle), migrations.ts (SQL), client.ts, seed.ts, migrate.ts
  types/                    agent, auth, knowledge, llm, product, tool
  widgets/
    embed/widget.ts         مصدر الويدجت (يُبنى إلى public/widget.js)
    react/AgentWidget.tsx   مكوّن React
  proxy.ts                  حماية مسارات لوحة التحكم
docs/                       ARCHITECTURE, API, INTEGRATION, PROMPTS, ROADMAP
tests/                      node:test — chunker, embeddings, rbac, guardrails, engine (end-to-end بالمزوّد الوهمي)
scripts/build-widget.ts     esbuild للويدجت
```

---

## كيف يعمل الطلب (Request lifecycle)

1. `POST /api/v1/agent/chat` يتحقق من مفتاح API المرتبط بـ `productId` (أو جلسة المشرف من الـ Playground) + rate limit.
2. `runAgent()` يحمّل ملف المنتج من DB، يبني `Principal` (tenant/user/role) ويتحقق من أن الدور مسموح للمنتج.
3. يحدد الأدوات المتاحة = المفعّلة للمنتج ∩ ما يسمح به دور المستخدم (`resolveAvailableTools`).
4. استرجاع المعرفة من الـ vector store **مقيداً بـ productId** على مستوى الاستعلام.
5. تركيب البرمبت من الطبقات (ثابتة أولاً لصالح prompt caching، ثم المعرفة والسياق).
6. حلقة LLM: إذا طلب النموذج أداة → تنفيذ عبر الـ registry (تحقق صلاحيات + Zod للمدخلات والمخرجات) → إعادة النتيجة → حتى 4 دورات.
7. Guardrails: استخراج `<meta>` (ثقة/تحويل)، حجب معرّفات غريبة، تنبيه إذا سُئل عن منتج آخر.
8. الثقة = مزيج من تقييم النموذج + قوة الاسترجاع/نجاح الأدوات، مع سقف عند غياب الدليل.
9. حفظ الرسائل (مع المصادر والأدوات والثقة) وإرجاع `{answer, confidence, sources, suggestedActions, handoffRequired}`.

---

## كيف أضيف منتجاً جديداً

**من لوحة التحكم** (دقائق):
1. المنتجات → إضافة منتج → املأ الاسم/الوصف/الجمهور/اسم المساعد → يُنشأ المنتج ومفتاح API.
2. إعداد الوكيل → الباقات، الأسئلة الشائعة، السياسات، النبرة، القيود، الأدوار، حد الثقة.
3. قاعدة المعرفة → ارفع PDF/Markdown أو أضف روابط. أعد فهرسة الأسئلة الشائعة.
4. الأدوات → فعّل ما يناسب المنتج فقط.
5. الربط والتضمين → انسخ snippet الويدجت أو مثال cURL.

**بالكود** (للنسخ التجريبية/الـ IaC): أضف ملفاً في `src/data/products/<id>.ts` بنفس شكل `mahsuma-cloud.ts`، سجّله في `src/data/products/index.ts`، ضع وثائقه في `src/data/knowledge/<id>/*.md`، ثم `npm run db:seed`.

## كيف أرفع معرفة جديدة

- لوحة التحكم → المنتج → قاعدة المعرفة → ملف / نص / رابط. تظهر الحالة (جاهز/فشل) وعدد المقاطع، ويمكن اختبار البحث الدلالي مباشرة.
- API: `POST /api/v1/products/{id}/knowledge` (multipart `file` أو JSON `{type:"markdown"|"text"|"url", ...}`) — راجع `docs/API.md`.
- كل مصدر مرتبط بـ `productId` واحد؛ لا يمكن للوكيل رؤية معرفة منتج آخر.

## كيف أربطه داخل أي منتج

- **Backend-to-backend**: `POST /api/v1/agent/chat` مع `Authorization: Bearer mak_...` وهوية المستخدم في الجسم.
- **Widget/متصفح**: خادمك يولّد رمز مستخدم موقّعاً (`signUserToken` في `src/lib/tenancy/user-token.ts`) ثم `<script src=".../widget.js" data-product-id=".." data-user-token="mat_..">`. مفتاح المنتج لا يصل للمتصفح أبداً.
- **React**: `<AgentWidget productId userToken baseUrl />` (`src/widgets/react/AgentWidget.tsx`).
- للتجربة: `npm run token -- mahsuma-cloud mak_… company_123 user_456 customer_admin`.

التفاصيل ومواصفة الرمز في `docs/INTEGRATION.md`.

## أين أعدّل prompt كل منتج

| الطبقة | المكان |
|---|---|
| البرمبت العام للمنصة | `src/data/prompts/system.md` |
| قواعد الأمان | `src/data/prompts/safety.md` |
| استخدام الأدوات / التنسيق | `src/data/prompts/tool-use.md`, `formatting.md` |
| برمبت الدور | `src/data/prompts/roles/<role>.md` |
| برمبت المنتج (persona + تعليمات خاصة + باقات + سياسات) | لوحة التحكم → إعداد الوكيل، أو حقل `productPrompt` في ملف التعريف |

`src/lib/agent/prompt-builder.ts` هو المكان الوحيد الذي يركّب هذه الطبقات. أمثلة كاملة في `docs/PROMPTS.md`.

## ما الذي يحتاج API حقيقياً لاحقاً

| الأداة | الحالة الآن | التكامل المطلوب |
|---|---|---|
| `get_current_user` | من الطلب المصادق | إثراء من user service للمنتج |
| `fetch_billing_summary` | mock | نظام الفوترة (Stripe/Moyasar/داخلي) مقيّد بـ tenantId |
| `check_project_status` | mock | API المشاريع/النشر في محسومة كلاود |
| `create_support_ticket` | mock | Zendesk/Freshdesk/CRM |
| `suggest_plan` | قواعد على الباقات | يمكن إبقاؤه كما هو أو إثراؤه ببيانات الاستخدام |
| `explain_deployment_steps` | من الوثائق | — |
| `create_onboarding_checklist` | قوالب ثابتة | حالة الإعداد الفعلية من المنتج |
| Embeddings | محلية (hash n-gram) | Voyage/OpenAI لجودة دلالية أعلى |
| Vector store | SQLite in-process | pgvector عند > ~50k مقطع/منتج |
| Rate limit | ذاكرة العملية | Redis عند تعدد النسخ |
| جلسة المشرف | كلمة مرور واحدة | SSO/OAuth ومستخدمون متعددون |

## القرارات الهندسية ولماذا

- **Next.js 16 (App Router) تطبيق واحد** للوحة التحكم والـ API والويدجت: أسهل نشر وصيانة لـ MVP، والـ API منفصل منطقياً تحت `src/lib` فيمكن نقله لخدمة مستقلة لاحقاً بلا تغيير في المحرك.
- **SQLite + Drizzle** مع migrations بصيغة SQL خام ذاتية التطبيق: يعمل فوراً بدون بنية تحتية، والمخطط يستخدم أنواعاً لها مقابل مباشر في PostgreSQL (المتجهات تصبح `vector` في pgvector).
- **Vector store كواجهة** (`VectorStore`) مع تنفيذ SQLite يحسب cosine داخل العملية + إعادة ترتيب لفظي (hybrid): كافٍ لعشرات الآلاف من المقاطع لكل منتج، والعزل بالمنتج مُنفَّذ في طبقة التخزين لا في البرمبت فقط.
- **Embeddings محلية افتراضياً** (hashed char n-grams مع تطبيع عربي): تجعل المشروع يعمل بلا مفاتيح وتتعامل مع الصرف العربي بشكل مقبول؛ الانتقال لـ Voyage/OpenAI بتغيير متغير واحد.
- **LLM Provider Adapter بصيغة رسائل محايدة** (`LlmMessage`/`LlmToolSpec`) + حلقة أدوات يدوية: لا اعتماد على beta helpers، ونفس المحرك يعمل مع Anthropic/OpenAI/Mock. المزوّدات تُحمَّل lazy حتى لا يُستورد SDK غير مستخدم.
- **Mock provider مؤسَّس على المعرفة** وليس ردوداً عشوائية: يتيح اختبار RAG والأدوات والثقة والتحويل end-to-end في CI بدون تكلفة.
- **الأدوات = Zod in/out + permissions + sideEffect**: الـ registry هو نقطة القرار الوحيدة (مفعّلة للمنتج ∩ مسموحة للدور)، والنموذج لا يرى أداة لا يحق للمستخدم استخدامها.
- **الثقة محسوبة لا مُدّعاة**: تقييم النموذج يُخلط بقوة الاسترجاع ويُسقَّف عند غياب الدليل، وهو ما يغذي شاشة "أسئلة لم يُجب عنها بثقة".
- **مفاتيح API لكل منتج مخزّنة كـ hash** وبادئة تحمل اسم المنتج لتسهيل الدعم، ومحادثة واحدة = منتج + tenant + user (أي محاولة إكمال محادثة من tenant آخر تنشئ محادثة جديدة بدل الدمج).
- **هوية المتصفح برمز موقّع لا بمفتاح**: الويدجت لا يحمل مفتاح المنتج ولا يختار دوره؛ الباك-إند يوقّع `tenant/user/role` بـ HMAC مشتق من المفتاح، والمنصة تتحقق بالـ hash المخزّن. هذا يغلق انتحال الدور/الحساب من المتصفح ويجعل الـ rate limit مبنياً على هوية موثوقة.
- **حماية SSRF في استيراد الروابط**: تحليل DNS قبل الجلب ورفض النطاقات الخاصة (IPv4/IPv6) وعدم تتبّع التحويلات.
- **البرمبت طبقات مرتبة** بحيث الثابت أولاً والمتغير آخراً لتعظيم prompt caching لدى Anthropic.
- **الويدجت vanilla + esbuild** (12 KB) لا يعتمد على إطار المنتج المضيف، ويبني DOM من نصوص فقط (لا innerHTML لبيانات المستخدم).

## الافتراضات

- مصادقة لوحة التحكم بكلمة مرور واحدة (`ADMIN_PASSWORD`) كافية لـ MVP داخلي.
- هوية المستخدم/الشركة في جسم الطلب موثوقة فقط مع مفتاح المنتج (server-to-server)؛ من المتصفح تُستخدم الرموز الموقّعة.
- `SESSION_SECRET` إلزامي (16 حرفاً فأكثر) في الإنتاج؛ التطبيق يرفض الإقلاع بدونه.
- الأسعار بالريال وبدون ضريبة، والمنتجان التجريبيان ببيانات افتراضية قابلة للتعديل من اللوحة.
- خطة التطوير في `docs/ROADMAP.md`.
