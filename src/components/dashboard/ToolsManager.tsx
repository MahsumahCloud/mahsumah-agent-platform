"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/dashboard/fetcher";

interface ToolRow { id: string; description: string; category: string; requiredPermissions: string[]; requiresAccountContext: boolean; sideEffect: boolean }

const CAT: Record<string, string> = { account: "الحساب", product: "المنتج", knowledge: "المعرفة", support: "الدعم", billing: "الفوترة", onboarding: "التهيئة" };

export function ToolsManager({ productId, enabled, tools }: { productId: string; enabled: string[]; tools: ToolRow[] }) {
  const router = useRouter();
  const [set, setSet] = useState(new Set(enabled));
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(id: string) {
    const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id);
    setSet(next); setSaving(id);
    try { await api(`/api/v1/products/${productId}`, { method: "PATCH", json: { enabledTools: [...next] } }); router.refresh(); }
    catch { setSet(set); } finally { setSaving(null); }
  }

  return (
    <div className="card p-5">
      <p className="mb-4 text-sm text-slate-500">كل أداة لها مخطط مدخلات ومخرجات وصلاحيات مطلوبة. الأداة تُتاح للوكيل فقط إذا كانت مفعّلة هنا <b>و</b>كان دور المستخدم يملك صلاحياتها. الأدوات الحالية mock بواجهات حقيقية؛ استبدل التنفيذ في <code dir="ltr">src/lib/tools/definitions/</code>.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {tools.map((t) => (
          <label key={t.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${set.has(t.id) ? "border-brand-500 bg-brand-50/40" : "border-slate-200"}`}>
            <input type="checkbox" className="mt-1 h-4 w-4" checked={set.has(t.id)} disabled={saving === t.id} onChange={() => toggle(t.id)} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2"><code className="text-sm font-bold" dir="ltr">{t.id}</code><span className="badge bg-slate-100 text-slate-600">{CAT[t.category] ?? t.category}</span>{t.sideEffect && <span className="badge bg-amber-100 text-amber-800">إجراء</span>}{t.requiresAccountContext && <span className="badge bg-indigo-100 text-indigo-800">بيانات حساب</span>}</div>
              <p className="mt-1 text-xs text-slate-600">{t.description}</p>
              <div className="mt-2 text-[11px] text-slate-400" dir="ltr">permissions: {t.requiredPermissions.length ? t.requiredPermissions.join(", ") : "none"}</div>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
