import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// Isolated database + mock provider for a full engine run.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-test-"));
process.env.DATABASE_PATH = path.join(dir, "test.db");
process.env.LLM_PROVIDER = "mock";
process.env.EMBEDDING_PROVIDER = "local";

let runAgent: typeof import("../src/lib/agent").runAgent;

before(async () => {
  const { seedProducts } = await import("../src/data/products");
  const { upsertProduct } = await import("../src/lib/products/repository");
  const { ingestDocument } = await import("../src/lib/rag/ingest");
  for (const p of seedProducts) upsertProduct(p);
  const doc = fs.readFileSync(path.join(process.cwd(), "src/data/knowledge/mahsuma-cloud/deployment-guide.md"), "utf8");
  await ingestDocument({ productId: "mahsuma-cloud", type: "markdown", title: "دليل النشر", text: doc, reference: "deployment-guide.md" });
  ({ runAgent } = await import("../src/lib/agent"));
});

after(() => { fs.rmSync(dir, { recursive: true, force: true }); });

test("answers a documented question with sources and confidence", async () => {
  const r = await runAgent({ productId: "mahsuma-cloud", tenantId: "t1", userId: "u1", role: "developer", message: "كيف أنشر تطبيق Next.js؟" });
  assert.ok(r.answer.includes("GitHub") || r.answer.includes("Next.js"));
  assert.ok(r.sources.length > 0);
  assert.ok(r.confidence >= 0.5);
  assert.equal(r.handoffRequired, false);
});

test("uses a tool when the role permits and recommends a plan", async () => {
  const r = await runAgent({ productId: "mahsuma-cloud", tenantId: "t1", userId: "u1", role: "customer_admin", message: "ما هي أفضل باقة لموقعي؟" });
  assert.deepEqual(r.toolCalls.map((t) => t.toolId), ["suggest_plan"]);
  assert.ok(r.suggestedActions.some((a) => a.type === "upgrade_plan"));
});

test("refuses account tools for roles without permission", async () => {
  const r = await runAgent({ productId: "mahsuma-cloud", tenantId: "t1", userId: "u9", role: "visitor", message: "ما هي فاتورتي القادمة؟" });
  assert.equal(r.toolCalls.length, 0);
  assert.equal(r.handoffRequired, true);
});

test("does not leak knowledge across products", async () => {
  const r = await runAgent({ productId: "mahsuma-dcc", tenantId: "t2", userId: "u2", role: "customer", message: "كيف أنشر تطبيق Next.js؟" });
  assert.equal(r.sources.length, 0);
  assert.equal(r.handoffRequired, true);
});

test("conversation continuity is scoped to the same tenant/user", async () => {
  const a = await runAgent({ productId: "mahsuma-cloud", tenantId: "t1", userId: "u1", role: "customer", message: "أين توجد الخوادم؟" });
  const b = await runAgent({ productId: "mahsuma-cloud", tenantId: "OTHER", userId: "u1", role: "customer", message: "تابع", conversationId: a.conversationId });
  assert.notEqual(a.conversationId, b.conversationId);
});

test("rejects roles not allowed for the product", async () => {
  await assert.rejects(() => runAgent({ productId: "mahsuma-dcc", tenantId: "t2", userId: "u2", role: "developer", message: "hi" }), /not allowed/);
});
