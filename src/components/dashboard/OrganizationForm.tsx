"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/dashboard/fetcher";
import type { ProductProfile } from "@/types";

export function OrganizationForm({ initial }: { initial: ProductProfile }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true); setMsg(null);
    try { const r = await api<{ product: ProductProfile }>(`/api/v1/products/${p.id}`, { method: "PATCH", json: p }); setP(r.product); setMsg({ ok: true, text: "تم الحفظ" }); router.refresh(); }
    catch (err) { setMsg({ ok: false, text: err instanceof ApiClientError ? err.message : "فشل الحفظ" }); }
    finally { setSaving(false); }
  }

  return (
    <div className="card space-y-4 p-6">
      <div className="grid gap-4 md:grid-cols-[96px_1fr_1fr]">
        <div>
          <label className="label">الشعار</label>
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {p.theme.logoUrl ? <img src={p.theme.logoUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-2xl font-bold text-slate-400">{p.name.slice(0, 1)}</span>}
          </div>
        </div>
        <div><label className="label">اسم المؤسسة</label><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
        <div><label className="label">رابط الشعار الافتراضي (يُستخدم لكل منتج لا يملك شعاراً خاصاً)</label><input className="input" dir="ltr" placeholder="/brand/mahsuma-logo.svg أو https://…" value={p.theme.logoUrl ?? ""} onChange={(e) => setP({ ...p, theme: { ...p.theme, logoUrl: e.target.value } })} /></div>
      </div>
      <div><label className="label">تعريف المؤسسة (يظهر لكل الوكلاء)</label><textarea className="input" rows={3} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
      <div><label className="label">تعليمات مشتركة لكل الوكلاء (الهوية، القيم، قنوات التواصل، قواعد التوجيه)</label><textarea className="input min-h-[160px] font-mono text-xs leading-6" value={p.productPrompt} onChange={(e) => setP({ ...p, productPrompt: e.target.value })} /></div>
      <div><label className="label">الموقع الرئيسي</label><input className="input" dir="ltr" value={p.website ?? ""} onChange={(e) => setP({ ...p, website: e.target.value })} /></div>
      <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
        <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "جاري الحفظ…" : "حفظ"}</button>
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
        <span className="text-xs text-slate-400">ضع ملف الشعار في <code dir="ltr">public/brand/</code> ثم أشر إليه هنا، أو استخدم رابطاً خارجياً.</span>
      </div>
    </div>
  );
}
