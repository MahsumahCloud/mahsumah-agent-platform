import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products/repository";
import { getConversation, listConversations, listLowConfidenceAnswers, productAnalytics } from "@/lib/agent/conversations";
import { ConfidenceBadge, EmptyState, StatCard } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ConversationsPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string; c?: string }> }) {
  const { id } = await params;
  const { view = "all", c } = await searchParams;
  const product = getProduct(id);
  if (!product) notFound();
  const stats = productAnalytics(id, product.confidenceThreshold);
  const conversations = listConversations(id, { lowConfidenceBelow: view === "low" ? product.confidenceThreshold : undefined });
  const lowAnswers = view === "questions" ? listLowConfidenceAnswers(id, product.confidenceThreshold) : [];
  const selected = c ? getConversation(c) : undefined;
  const base = `/products/${id}/conversations`;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-5">
        <StatCard label="المحادثات" value={stats.conversations} />
        <StatCard label="الإجابات" value={stats.answers} />
        <StatCard label="متوسط الثقة" value={stats.avgConfidence !== null ? `${Math.round(stats.avgConfidence * 100)}%` : "—"} tone={stats.avgConfidence !== null && stats.avgConfidence < product.confidenceThreshold ? "bad" : "good"} />
        <StatCard label="إجابات منخفضة الثقة" value={stats.lowConfidence} tone={stats.lowConfidence > 0 ? "warn" : "default"} hint={`أقل من ${Math.round(product.confidenceThreshold * 100)}%`} />
        <StatCard label="تحويلات للدعم" value={stats.handoffs} tone={stats.handoffs > 0 ? "warn" : "default"} />
      </div>
      <div className="flex gap-1 border-b border-slate-200 text-sm">
        {[{ v: "all", l: "كل المحادثات" }, { v: "low", l: "محادثات منخفضة الثقة" }, { v: "questions", l: "أسئلة لم يُجب عنها بثقة" }].map((t) => <Link key={t.v} href={`${base}?view=${t.v}`} className={`-mb-px border-b-2 px-4 py-2 ${view === t.v ? "border-brand-700 font-semibold text-brand-700" : "border-transparent text-slate-500"}`}>{t.l}</Link>)}
      </div>
      {view === "questions" ? (
        lowAnswers.length === 0 ? <EmptyState title="لا توجد أسئلة منخفضة الثقة" description="ممتاز — كل الإجابات فوق الحد الأدنى. عندما يعجز الوكيل ستظهر الأسئلة هنا لتضيف لها معرفة." /> : (
          <div className="card divide-y divide-slate-100">
            {lowAnswers.map(({ message, question }) => (
              <div key={message.id} className="flex items-start gap-4 p-4 text-sm">
                <ConfidenceBadge value={message.confidence} threshold={product.confidenceThreshold} />
                <div className="flex-1"><div className="font-semibold">{question ?? "—"}</div><div className="mt-1 line-clamp-2 text-slate-500">{message.content}</div><div className="mt-1 text-xs text-slate-400">{new Date(message.createdAt).toLocaleString("ar-SA")} · <Link className="underline" href={`${base}?view=all&c=${message.conversationId}`}>عرض المحادثة</Link></div></div>
                <Link href={`/products/${id}/knowledge`} className="btn-secondary">إضافة معرفة</Link>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <div className="card divide-y divide-slate-100">
            {conversations.length === 0 && <div className="p-6 text-center text-sm text-slate-500">لا توجد محادثات بعد. جرّب الوكيل من صفحة التجربة أو عبر API.</div>}
            {conversations.map((cv) => (
              <Link key={cv.id} href={`${base}?view=${view}&c=${cv.id}`} className={`block p-4 text-sm hover:bg-slate-50 ${selected?.summary.id === cv.id ? "bg-brand-50/50" : ""}`}>
                <div className="flex items-center justify-between"><span className="font-semibold" dir="ltr">{cv.userId}</span><ConfidenceBadge value={cv.lowestConfidence} threshold={product.confidenceThreshold} /></div>
                <div className="mt-1 text-xs text-slate-500" dir="ltr">{cv.tenantId} · {cv.role} · {cv.messageCount} msgs</div>
                <div className="text-xs text-slate-400">{new Date(cv.lastMessageAt).toLocaleString("ar-SA")}</div>
              </Link>
            ))}
          </div>
          <div className="card p-5">
            {!selected ? <p className="text-sm text-slate-500">اختر محادثة لعرضها.</p> : (
              <div className="space-y-3">
                {selected.messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${m.role === "user" ? "bg-slate-100" : "border border-slate-200 bg-white"}`}>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                      {m.role === "assistant" && <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500"><ConfidenceBadge value={m.confidence} threshold={product.confidenceThreshold} />{m.handoffRequired && <span className="badge bg-amber-100 text-amber-800">تحويل</span>}{m.toolCalls?.map((t, i) => <span key={i} className="badge bg-indigo-100 text-indigo-800" dir="ltr">⚙ {t.toolId}</span>)}{m.sources && m.sources.length > 0 && <span>المصادر: {m.sources.map((s) => s.title).join(" · ")}</span>}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
