"use client";

import { useState } from "react";
import { api, ApiClientError } from "@/lib/dashboard/fetcher";
import { EmptyState } from "@/components/ui";
import type { KnowledgeSource, RetrievedChunk } from "@/types";

const TYPE_LABEL: Record<string, string> = { markdown: "Markdown", pdf: "PDF", url: "رابط", text: "نص", faq: "أسئلة شائعة" };

export function KnowledgeManager({ productId, initialSources, faqCount }: { productId: string; initialSources: KnowledgeSource[]; faqCount: number }) {
  const [sources, setSources] = useState(initialSources);
  const [mode, setMode] = useState<"file" | "text" | "url">("file");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<RetrievedChunk[] | null>(null);

  async function refresh() { const r = await api<{ sources: KnowledgeSource[] }>(`/api/v1/products/${productId}/knowledge`); setSources(r.sources); }

  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(null);
    try {
      if (mode === "file") {
        if (!file) throw new Error("اختر ملفاً");
        const fd = new FormData(); fd.append("file", file); if (title) fd.append("title", title);
        await api(`/api/v1/products/${productId}/knowledge`, { method: "POST", body: fd });
      } else if (mode === "url") {
        await api(`/api/v1/products/${productId}/knowledge`, { method: "POST", json: { type: "url", url, title: title || undefined } });
      } else {
        await api(`/api/v1/products/${productId}/knowledge`, { method: "POST", json: { type: "markdown", title, text } });
      }
      setTitle(""); setText(""); setUrl(""); setFile(null); await refresh();
    } catch (err) { setError(err instanceof ApiClientError ? err.message : err instanceof Error ? err.message : "فشلت الإضافة"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("حذف هذا المصدر وكل مقاطعه؟")) return;
    await api(`/api/v1/knowledge/${id}`, { method: "DELETE" }); await refresh();
  }

  async function reindexFaqs() {
    setBusy(true); setError(null);
    try {
      const existing = sources.find((s) => s.reference === "faqs");
      if (existing) await api(`/api/v1/knowledge/${existing.id}`, { method: "DELETE" });
      const p = await api<{ product: { faqs: { question: string; answer: string }[] } }>(`/api/v1/products/${productId}`);
      const body = p.product.faqs.map((f) => `## ${f.question}\n\n${f.answer}`).join("\n\n");
      await api(`/api/v1/products/${productId}/knowledge`, { method: "POST", json: { type: "markdown", title: "الأسئلة الشائعة", text: `# الأسئلة الشائعة\n\n${body}` } });
      await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "فشل"); } finally { setBusy(false); }
  }

  async function search(e: React.FormEvent) {
    e.preventDefault(); if (!q.trim()) return;
    const r = await api<{ results: RetrievedChunk[] }>(`/api/v1/products/${productId}/knowledge?q=${encodeURIComponent(q)}`); setResults(r.results);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold">مصادر المعرفة ({sources.length})</h2>
            <button className="btn-secondary" onClick={reindexFaqs} disabled={busy || faqCount === 0}>إعادة فهرسة الأسئلة الشائعة ({faqCount})</button>
          </div>
          {sources.length === 0 ? <EmptyState title="لا توجد مصادر" description="ارفع ملف PDF أو Markdown أو أضف رابطاً ليبدأ الوكيل بالإجابة من معرفة موثقة." /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-right text-xs text-slate-500"><th className="py-2">العنوان</th><th>النوع</th><th>المقاطع</th><th>الحالة</th><th></th></tr></thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="py-2"><div className="font-medium">{s.title}</div>{s.reference && <div className="text-xs text-slate-400" dir="ltr">{s.reference}</div>}</td>
                    <td><span className="badge bg-slate-100 text-slate-600">{TYPE_LABEL[s.type] ?? s.type}</span></td>
                    <td>{s.chunkCount}</td>
                    <td><span className={`badge ${s.status === "ready" ? "bg-emerald-100 text-emerald-800" : s.status === "failed" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{s.status === "ready" ? "جاهز" : s.status === "failed" ? "فشل" : "قيد المعالجة"}</span>{s.error && <div className="text-xs text-red-600">{s.error}</div>}</td>
                    <td className="text-left"><button className="text-xs text-red-600 hover:underline" onClick={() => remove(s.id)}>حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-bold">اختبار البحث الدلالي</h2>
          <form onSubmit={search} className="flex gap-2"><input className="input" placeholder="مثال: كيف أضيف نطاق مخصص؟" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn-primary">بحث</button></form>
          {results && (results.length === 0 ? <p className="mt-3 text-sm text-slate-500">لا نتائج فوق الحد الأدنى.</p> : (
            <ul className="mt-3 space-y-2">{results.map((r) => <li key={r.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm"><div className="mb-1 flex items-center justify-between text-xs text-slate-500"><span>{r.sourceTitle}{r.heading ? ` › ${r.heading}` : ""}</span><span className="badge bg-white">{Math.round(r.score * 100)}%</span></div><div className="line-clamp-3 whitespace-pre-wrap text-slate-700">{r.content}</div></li>)}</ul>
          ))}
        </div>
      </div>
      <form onSubmit={add} className="card h-fit space-y-3 p-5">
        <h2 className="font-bold">إضافة معرفة</h2>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs">{(["file", "text", "url"] as const).map((m) => <button type="button" key={m} onClick={() => setMode(m)} className={`flex-1 rounded-lg py-1.5 ${mode === m ? "bg-white font-semibold shadow-sm" : "text-slate-500"}`}>{m === "file" ? "ملف PDF/MD" : m === "text" ? "نص / Markdown" : "رابط"}</button>)}</div>
        <div><label className="label">العنوان {mode !== "text" && "(اختياري)"}</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required={mode === "text"} /></div>
        {mode === "file" && <div><label className="label">الملف (حتى 15 MB)</label><input className="input" type="file" accept=".pdf,.md,.markdown,.txt" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required /></div>}
        {mode === "url" && <div><label className="label">الرابط</label><input className="input" dir="ltr" type="url" value={url} onChange={(e) => setUrl(e.target.value)} required /></div>}
        {mode === "text" && <div><label className="label">المحتوى</label><textarea className="input min-h-[200px] font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} required /></div>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "جاري الفهرسة…" : "إضافة وفهرسة"}</button>
        <p className="text-xs text-slate-400">تُقسَّم الوثيقة إلى مقاطع، تُولَّد لها embeddings، وتُربط بهذا المنتج فقط.</p>
      </form>
    </div>
  );
}
