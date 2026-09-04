import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products/repository";
import { listApiKeys } from "@/lib/tenancy/api-keys";
import { ApiKeysPanel } from "@/components/dashboard/ApiKeysPanel";

export const dynamic = "force-dynamic";

export default async function IntegratePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const keys = listApiKeys(id);

  const tokenSnippet = `// في الباك-إند الخاص بمنتجك (Node) — انسخ signUserToken من src/lib/tenancy/user-token.ts
const token = signUserToken(
  { productId: "${id}", tenantId: org.id, userId: user.id, role: "customer_admin", name: user.name, ttlSeconds: 900 },
  process.env.MAHSUMAH_AGENT_KEY,   // مفتاح المنتج mak_… يبقى في الخادم فقط
);
// أرسل token إلى الصفحة (مثلاً ضمن HTML أو من endpoint خاص بك)`;
  const scriptSnippet = `<script src="${base}/widget.js"
  data-product-id="${id}"
  data-user-token="mat_...token-from-your-backend..."
  data-locale="ar"
  data-page-context='{"path":"/dashboard/projects","projectType":"nextjs"}'>
</script>`;
  const reactSnippet = `// انسخ src/widgets/react/AgentWidget.tsx إلى مشروعك
<AgentWidget
  productId="${id}"
  userToken={token}
  locale="ar"
  baseUrl="${base}"
  pageContext={{ path: router.pathname, projectType: "nextjs" }}
/>`;
  const curlSnippet = `curl -X POST ${base}/api/v1/agent/chat \\
  -H "Authorization: Bearer mak_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "productId": "${id}",
    "tenantId": "company_123",
    "userId": "user_456",
    "role": "customer_admin",
    "message": "ما هي أفضل باقة لموقعي؟",
    "pageContext": { "path": "/dashboard/projects", "projectType": "nextjs" }
  }'`;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <ApiKeysPanel productId={id} initialKeys={keys} />
        <div className="card p-5">
          <h2 className="mb-2 font-bold">REST API</h2>
          <p className="mb-3 text-sm text-slate-500">من الباك-إند الخاص بمنتجك: مفتاح المنتج + هوية المستخدم كما هي في نظامك (مصدر موثوق). للمتصفح استخدم رمز المستخدم في العمود المقابل.</p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100" dir="ltr">{curlSnippet}</pre>
          <p className="mt-3 text-xs text-slate-500">الاستجابة: <code dir="ltr">{`{ answer, confidence, sources[], suggestedActions[], handoffRequired, conversationId, toolCalls[] }`}</code></p>
        </div>
      </div>
      <div className="space-y-6">
        <div className="card p-5">
          <h2 className="mb-2 font-bold">1) توليد رمز المستخدم في الباك-إند</h2>
          <p className="mb-3 text-sm text-slate-500">هوية المستخدم (الشركة/المستخدم/الدور) تُوقَّع في خادمك بمفتاح المنتج، فلا يمكن للمتصفح انتحال دور أو حساب آخر. للتجربة: <code dir="ltr">npm run token -- {id} mak_… company_123 user_456 customer_admin</code></p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100" dir="ltr">{tokenSnippet}</pre>
        </div>
        <div className="card p-5">
          <h2 className="mb-2 font-bold">2) تضمين الويدجت (Script)</h2>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100" dir="ltr">{scriptSnippet}</pre>
          <p className="mt-3 text-xs text-slate-500">يدعم RTL/LTR ويقرأ اللون والاسم والترحيب من إعدادات المنتج. لا تضع مفتاح mak_ في أي صفحة.</p>
        </div>
        <div className="card p-5">
          <h2 className="mb-2 font-bold">3) React Component</h2>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100" dir="ltr">{reactSnippet}</pre>
          <a href={`/demo?productId=${id}`} target="_blank" className="btn-secondary mt-3">فتح صفحة عرض الويدجت</a>
        </div>
      </div>
    </div>
  );
}
