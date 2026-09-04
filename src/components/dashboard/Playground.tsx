"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/dashboard/fetcher";
import { ConfidenceBadge } from "@/components/ui";
import type { AgentResponse, ProductProfile } from "@/types";

interface Turn { role: "user" | "assistant"; text: string; reply?: AgentResponse }

const SAMPLE_QUESTIONS: Record<string, string[]> = {
  "mahsuma-cloud": ["ما هي أفضل باقة لموقعي؟", "كيف أنشر تطبيق Next.js؟", "أين توجد الخوادم؟ وهل البيانات تبقى في السعودية؟", "حالة النشر فشلت، ما السبب؟", "افتح لي تذكرة دعم: النطاق لا يعمل", "ما هي فاتورتي القادمة؟", "هل تدعمون PHP؟"],
  "mahsuma": ["ما هي محسومة وما منتجاتها؟", "أبي أستضيف موقعي، أي منتج يناسبني؟", "كيف أتابع مؤشرات أداء شركتي؟", "كيف أتواصل مع المبيعات؟"],
  "mahsuma-dcc": ["كم عدد المؤشرات في باقة الفريق؟", "ما التكاملات المتاحة مع Power BI؟", "اقترح لي الباقة المناسبة لجهة حكومية", "كيف أبدأ إعداد المنشأة؟", "ما هو سعر محسومة كلاود؟"],
};

export function Playground({ product }: { product: ProductProfile }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState<string>(product.allowedRoles.includes("customer_admin") ? "customer_admin" : product.allowedRoles[0] ?? "visitor");
  const [tenantId, setTenantId] = useState("company_123");
  const [userId, setUserId] = useState("user_456");
  const [pagePath, setPagePath] = useState("/dashboard/projects");
  const [locale, setLocale] = useState<"ar" | "en" | "auto">("auto");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inspect, setInspect] = useState<AgentResponse | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [turns, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    setTurns((t) => [...t, { role: "user", text }]); setInput(""); setLoading(true); setError(null);
    try {
      const reply = await api<AgentResponse>("/api/v1/agent/chat", { method: "POST", json: { productId: product.id, tenantId, userId, role, message: text, conversationId, locale: locale === "auto" ? undefined : locale, pageContext: { path: pagePath, projectType: "nextjs" }, metadata: { source: "playground" } } });
      setConversationId(reply.conversationId);
      setTurns((t) => [...t, { role: "assistant", text: reply.answer, reply }]); setInspect(reply);
    } catch (err) { setError(err instanceof ApiClientError ? `${err.code}: ${err.message}` : "فشل الاتصال"); }
    finally { setLoading(false); }
  }

  function reset() { setTurns([]); setConversationId(undefined); setInspect(null); setError(null); }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr_360px]">
      <aside className="card h-fit space-y-3 p-5">
        <h2 className="font-bold">سياق الطلب</h2>
        <div><label className="label">الدور</label><select className="input" value={role} onChange={(e) => { setRole(e.target.value); reset(); }}>{product.allowedRoles.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
        <div><label className="label">Tenant ID</label><input className="input" dir="ltr" value={tenantId} onChange={(e) => setTenantId(e.target.value)} /></div>
        <div><label className="label">User ID</label><input className="input" dir="ltr" value={userId} onChange={(e) => setUserId(e.target.value)} /></div>
        <div><label className="label">الصفحة الحالية (pageContext.path)</label><input className="input" dir="ltr" value={pagePath} onChange={(e) => setPagePath(e.target.value)} /></div>
        <div><label className="label">اللغة</label><select className="input" value={locale} onChange={(e) => setLocale(e.target.value as typeof locale)}><option value="auto">تلقائي</option><option value="ar">العربية</option><option value="en">English</option></select></div>
        <div className="border-t border-slate-100 pt-3">
          <div className="label">أسئلة تجريبية</div>
          <div className="flex flex-wrap gap-1">{(SAMPLE_QUESTIONS[product.id] ?? ["ما هي الباقات المتاحة؟", "كيف أبدأ؟"]).map((q) => <button key={q} onClick={() => send(q)} className="rounded-full border border-slate-200 px-2.5 py-1 text-right text-xs text-slate-600 hover:border-brand-500 hover:text-brand-700">{q}</button>)}</div>
        </div>
        <button className="btn-secondary w-full" onClick={reset}>محادثة جديدة</button>
      </aside>

      <section className="card flex h-[calc(100vh-260px)] min-h-[520px] flex-col">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: product.theme.primaryColor }}>{product.persona.name.slice(0, 1)}</div>
          <div><div className="text-sm font-semibold">{product.persona.name}</div><div className="text-xs text-slate-500">{conversationId ? `محادثة ${conversationId.slice(0, 8)}` : "محادثة جديدة"}</div></div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-5">
          {turns.length === 0 && <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">{product.persona.greeting}</div>}
          {turns.map((t, i) => t.role === "user" ? (
            <div key={i} className="flex justify-start"><div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2 text-sm text-white" style={{ background: product.theme.primaryColor }}>{t.text}</div></div>
          ) : (
            <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm">
              <div className="prose-chat whitespace-pre-wrap leading-6">{t.text}</div>
              {t.reply && <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 text-xs text-slate-500">
                <ConfidenceBadge value={t.reply.confidence} threshold={product.confidenceThreshold} />
                {t.reply.handoffRequired && <span className="badge bg-amber-100 text-amber-800">يحتاج تحويل</span>}
                {t.reply.toolCalls.map((c, j) => <span key={j} className={`badge ${c.error ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-800"}`} dir="ltr">⚙ {c.toolId}</span>)}
                {t.reply.sources.length > 0 && <span>المصادر: {t.reply.sources.map((s) => s.title).join(" · ")}</span>}
                <button className="underline" onClick={() => setInspect(t.reply!)}>تفاصيل</button>
              </div>}
              {t.reply && t.reply.suggestedActions.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{t.reply.suggestedActions.map((a, j) => <span key={j} className="rounded-full border px-2 py-0.5 text-xs" style={{ borderColor: product.theme.primaryColor, color: product.theme.primaryColor }}>{a.label}</span>)}</div>}
            </div></div>
          ))}
          {loading && <div className="text-xs text-slate-400">جاري التفكير…</div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          <div ref={bottom} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-slate-100 p-3">
          <input className="input" placeholder="اكتب سؤالاً كما سيكتبه العميل…" value={input} onChange={(e) => setInput(e.target.value)} disabled={loading} />
          <button className="btn-primary" disabled={loading || !input.trim()}>إرسال</button>
        </form>
      </section>

      <aside className="card h-fit p-5 text-sm">
        <h2 className="mb-3 font-bold">تشريح الرد</h2>
        {!inspect ? <p className="text-slate-500">أرسل سؤالاً لعرض الثقة والمصادر والأدوات المستخدمة والاستجابة الخام كما يستقبلها المنتج.</p> : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">الثقة</div><div className="font-bold">{Math.round(inspect.confidence * 100)}%</div></div>
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">تحويل لإنسان</div><div className="font-bold">{inspect.handoffRequired ? "نعم" : "لا"}</div></div>
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">النموذج</div><div className="font-bold" dir="ltr">{inspect.usage?.model}</div></div>
              <div className="rounded-lg bg-slate-50 p-2"><div className="text-slate-500">Tokens</div><div className="font-bold" dir="ltr">{(inspect.usage?.inputTokens ?? 0) + (inspect.usage?.outputTokens ?? 0)}</div></div>
            </div>
            {inspect.sources.length > 0 && <div><div className="label">المصادر</div><ul className="space-y-1">{inspect.sources.map((s) => <li key={s.chunkId} className="rounded-lg border border-slate-100 p-2 text-xs"><div className="font-semibold">{s.title} <span className="text-slate-400">({Math.round(s.score * 100)}%)</span></div><div className="mt-1 line-clamp-3 text-slate-500">{s.excerpt}</div></li>)}</ul></div>}
            {inspect.toolCalls.length > 0 && <div><div className="label">الأدوات</div>{inspect.toolCalls.map((c, i) => <pre key={i} className="mb-1 overflow-x-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100" dir="ltr">{c.toolId} ({c.durationMs}ms)\n{JSON.stringify(c.error ?? c.output, null, 1)}</pre>)}</div>}
            <details><summary className="cursor-pointer text-xs text-slate-500">JSON الكامل</summary><pre className="mt-1 max-h-72 overflow-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100" dir="ltr">{JSON.stringify(inspect, null, 2)}</pre></details>
          </div>
        )}
      </aside>
    </div>
  );
}
