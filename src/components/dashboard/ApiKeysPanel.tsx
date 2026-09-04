"use client";

import { useState } from "react";
import { api } from "@/lib/dashboard/fetcher";
import type { ApiKeyRecord } from "@/lib/tenancy/api-keys";

export function ApiKeysPanel({ productId, initialKeys }: { productId: string; initialKeys: ApiKeyRecord[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { const r = await api<{ key: ApiKeyRecord; raw: string }>(`/api/v1/products/${productId}/api-keys`, { method: "POST", json: { label: label || "key" } }); setKeys([...keys, r.key]); setFresh(r.raw); setLabel(""); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    if (!confirm("إلغاء هذا المفتاح؟ سيتوقف كل تكامل يستخدمه.")) return;
    await api(`/api/v1/products/${productId}/api-keys`, { method: "DELETE", json: { keyId: id } });
    setKeys(keys.map((k) => (k.id === id ? { ...k, revokedAt: new Date().toISOString() } : k)));
  }

  return (
    <div className="card p-5">
      <h2 className="mb-2 font-bold">مفاتيح API</h2>
      <p className="mb-3 text-sm text-slate-500">كل مفتاح مرتبط بهذا المنتج فقط. يُخزَّن hash المفتاح ولا يمكن استرجاعه لاحقاً.</p>
      {fresh && <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs"><div className="mb-1 font-semibold text-emerald-800">انسخ المفتاح الآن — لن يظهر مرة أخرى</div><code className="block break-all" dir="ltr">{fresh}</code></div>}
      <table className="w-full text-sm">
        <tbody>
          {keys.map((k) => <tr key={k.id} className="border-t border-slate-100"><td className="py-2 font-medium">{k.label}</td><td dir="ltr" className="font-mono text-xs text-slate-500">{k.keyPrefix}…</td><td className="text-xs text-slate-400">{k.lastUsedAt ? `آخر استخدام ${new Date(k.lastUsedAt).toLocaleDateString("ar-SA")}` : "لم يُستخدم"}</td><td className="text-left">{k.revokedAt ? <span className="badge bg-slate-100 text-slate-500">ملغى</span> : <button className="text-xs text-red-600 hover:underline" onClick={() => revoke(k.id)}>إلغاء</button>}</td></tr>)}
        </tbody>
      </table>
      <form onSubmit={create} className="mt-3 flex gap-2"><input className="input" placeholder="اسم المفتاح (مثل: widget, backend)" value={label} onChange={(e) => setLabel(e.target.value)} /><button className="btn-primary" disabled={busy}>إنشاء</button></form>
    </div>
  );
}
