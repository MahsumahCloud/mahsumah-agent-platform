import "@/db/env";
import { runAgent } from "@/lib/agent";

/** End-to-end smoke run against the local DB with whatever LLM_PROVIDER is configured. */
const cases = [
  { productId: "mahsuma-cloud", tenantId: "company_123", userId: "user_456", role: "customer_admin", message: "ما هي أفضل باقة لموقعي؟", pageContext: { path: "/dashboard/projects", projectType: "nextjs" } },
  { productId: "mahsuma-cloud", tenantId: "company_123", userId: "user_456", role: "developer", message: "كيف أنشر تطبيق Next.js؟" },
  { productId: "mahsuma-cloud", tenantId: "company_123", userId: "user_456", role: "customer", message: "حالة النشر فشلت، ما السبب؟" },
  { productId: "mahsuma-dcc", tenantId: "org_1", userId: "u1", role: "visitor", message: "أريد فاتورتي الأخيرة" },
  { productId: "mahsuma-dcc", tenantId: "org_1", userId: "u1", role: "customer_admin", message: "افتح لي تذكرة دعم: لا أستطيع إضافة مؤشر جديد" },
  { productId: "mahsuma-dcc", tenantId: "org_1", userId: "u1", role: "customer", message: "ما هو سعر محسومة كلاود؟" },
];

async function main() {
  for (const c of cases) {
    const r = await runAgent(c);
    console.log(`\n▶ [${c.productId}/${c.role}] ${c.message}`);
    console.log(`  confidence=${r.confidence} handoff=${r.handoffRequired} tools=${r.toolCalls.map((t) => t.toolId).join(",") || "-"} sources=${r.sources.map((s) => s.title).join(" | ") || "-"}`);
    console.log(`  ${r.answer.replace(/\n/g, "\n  ").slice(0, 400)}`);
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
