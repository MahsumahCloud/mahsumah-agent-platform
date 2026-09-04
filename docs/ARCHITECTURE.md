# المعمارية

```
Host product (Cloud / DCC / …)
   │  widget.js  أو  backend → REST
   ▼
POST /api/v1/agent/chat  ── API key (product-scoped) + rate limit
   ▼
runAgent()  src/lib/agent/engine.ts
   ├─ products/repository      ← ProductProfile (DB, seeded from src/data/products)
   ├─ tenancy/context          ← Principal {tenantId, userId, role}
   ├─ tools/registry           ← enabled ∩ RBAC → available tools
   ├─ rag/retriever            ← VectorStore.query(productId, …)  (hybrid: cosine + lexical)
   ├─ agent/prompt-builder     ← layers: platform › product › role › safety › tools › formatting › knowledge › context
   ├─ llm/<provider>           ← Anthropic | OpenAI | Mock  (LlmMessage / LlmToolSpec neutral shapes)
   │     └─ tool loop (≤4)     → registry.executeTool (Zod in/out, permission check)
   ├─ agent/guardrails         ← <meta> extraction, redaction, cross-product notice
   ├─ agent/confidence         ← model self-report ⊗ evidence (retrieval / tools)
   └─ agent/conversations      ← persist user+assistant messages, sources, tool calls
```

## الحدود والعزل

| الحد | أين يُنفَّذ |
|---|---|
| المنتج ↔ المعرفة | `SqliteVectorStore.query` يفلتر `product_id` قبل الحساب |
| المنتج ↔ مفتاح API | `requireProductApiKey` يرفض مفتاحاً لمنتج آخر (403) |
| المنتج ↔ الأدوات | `product.enabledTools` |
| الدور ↔ الأدوات | `hasAllPermissions(role, tool.requiredPermissions)` |
| المستخدم ↔ المحادثة | `getOrCreateConversation` يطابق product+tenant+user وإلا ينشئ محادثة جديدة |
| المنتج ↔ الدور | `product.allowedRoles` (403 قبل أي استدعاء LLM) |

## قاعدة البيانات

`products` (profile JSON) · `api_keys` (hash) · `knowledge_sources` · `knowledge_chunks` (embedding BLOB float32) · `conversations` · `messages` (confidence, sources, tool_calls, handoff) · `audit_log`.

الترقية إلى PostgreSQL: استبدال `drizzle-orm/sqlite-core` بـ `pg-core` في `schema.ts`، والـ driver في `client.ts`، وتنفيذ `VectorStore` فوق pgvector (`embedding vector(1536)` + `<=>`). لا شيء في `lib/agent` أو `lib/tools` يعرف SQL.

## الطبقات القابلة للاستبدال

| الواجهة | التنفيذ الحالي | البدائل |
|---|---|---|
| `LlmProvider` | Anthropic / OpenAI / Mock | أي مزوّد يدعم tool calling |
| `EmbeddingProvider` | LocalHash / OpenAI / Voyage | Cohere, bge-m3 محلي |
| `VectorStore` | SQLite in-process | pgvector, Chroma, Pinecone, Qdrant |
| Rate limiter | in-memory | Redis |
| Admin auth | كلمة مرور + HMAC cookie | NextAuth/SSO |

## الثقة والتحويل

`confidence = clamp(0.55·self + 0.45·max(retrieval, tools))`، ويُسقَّف عند 0.45 إذا لم يوجد دليل. `handoffRequired = refusal ∨ meta.handoff ∨ confidence < product.confidenceThreshold`. الإجابات تحت الحد تظهر في لوحة التحكم تحت "أسئلة لم يُجب عنها بثقة" لتغذية قاعدة المعرفة.
