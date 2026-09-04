"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/dashboard/fetcher";
import { PageHeader } from "@/components/ui";
import type { ProductProfile } from "@/types";

const ALL_TOOLS = ["get_current_user", "get_product_info", "get_pricing_plans", "search_knowledge_base", "create_support_ticket", "check_project_status", "suggest_plan", "explain_deployment_steps", "fetch_billing_summary", "create_onboarding_checklist"];

export default function NewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState({ id: "", name: "", nameEn: "", description: "", audience: "", website: "", personaName: "", role: "مساعد العملاء", tone: "احترافي، واضح، سعودي", greeting: "", primaryColor: "#0f766e" });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ product: ProductProfile; apiKey: string } | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      const res = await api<{ product: ProductProfile; apiKey: string }>("/api/v1/products", { method: "POST", json: {
        id: form.id.trim().toLowerCase(), name: form.name, nameEn: form.nameEn || undefined, description: form.description, audience: form.audience, website: form.website || undefined,
        persona: { name: form.personaName || `مساعد ${form.name}`, role: form.role, tone: form.tone, greeting: form.greeting || `أنا ${form.personaName || `مساعد ${form.name}`}. كيف أقدر أساعدك اليوم؟`, canHelpWith: ["الأسئلة العامة عن المنتج", "الباقات", "الدعم الفني"], cannot: ["إعطاء وعود قانونية أو مالية", "ذكر أسعار غير موجودة في الباقات الرسمية"], defaultLocale: "ar" },
        productPrompt: "", plans: [], faqs: [], policies: [], enabledTools: ALL_TOOLS.filter((t) => !["check_project_status", "explain_deployment_steps"].includes(t)),
        allowedRoles: ["visitor", "customer", "customer_admin", "developer", "support_agent", "owner"], confidenceThreshold: 0.5,
        theme: { primaryColor: form.primaryColor, position: "bottom-right", title: form.personaName || `مساعد ${form.name}` }, status: "active",
      } });
      setCreated(res);
    } catch (err) { setError(err instanceof ApiClientError ? `${err.message}${err.details ? ` — ${JSON.stringify(err.details)}` : ""}` : "فشل الحفظ"); }
    finally { setSaving(false); }
  }

  if (created) {
    return (
      <>
        <PageHeader title="تم إنشاء المنتج" subtitle="احفظ مفتاح API الآن؛ لن يظهر مرة أخرى." />
        <div className="card max-w-2xl p-6">
          <div className="label">مفتاح API الخاص بالمنتج</div>
          <code className="block break-all rounded-xl bg-slate-900 p-4 text-sm text-emerald-300" dir="ltr">{created.apiKey}</code>
          <div className="mt-6 flex gap-2">
            <button className="btn-primary" onClick={() => router.push(`/products/${created.product.id}/settings`)}>إعداد الوكيل</button>
            <button className="btn-secondary" onClick={() => router.push(`/products/${created.product.id}/knowledge`)}>رفع المعرفة</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="إضافة منتج جديد" subtitle="يُنشأ وكيل مستقل للمنتج مع مفتاح API. يمكنك ضبط الباقات والأدوات والنبرة لاحقاً من الإعدادات." />
      <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label">معرّف المنتج (product id)</label><input className="input" dir="ltr" placeholder="my-product" pattern="[a-z0-9-]{2,48}" value={form.id} onChange={set("id")} required /></div>
          <div><label className="label">اللون الأساسي</label><input className="input" type="color" value={form.primaryColor} onChange={set("primaryColor")} /></div>
          <div><label className="label">اسم المنتج (عربي)</label><input className="input" value={form.name} onChange={set("name")} required /></div>
          <div><label className="label">اسم المنتج (English)</label><input className="input" dir="ltr" value={form.nameEn} onChange={set("nameEn")} /></div>
        </div>
        <div><label className="label">وصف المنتج</label><textarea className="input" rows={3} value={form.description} onChange={set("description")} required /></div>
        <div><label className="label">الجمهور المستهدف</label><input className="input" value={form.audience} onChange={set("audience")} required /></div>
        <div><label className="label">الموقع (اختياري)</label><input className="input" dir="ltr" value={form.website} onChange={set("website")} /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="label">اسم المساعد</label><input className="input" placeholder="مساعد …" value={form.personaName} onChange={set("personaName")} /></div>
          <div><label className="label">دور المساعد</label><input className="input" value={form.role} onChange={set("role")} /></div>
        </div>
        <div><label className="label">النبرة</label><input className="input" value={form.tone} onChange={set("tone")} /></div>
        <div><label className="label">رسالة الترحيب</label><textarea className="input" rows={2} value={form.greeting} onChange={set("greeting")} /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2"><button className="btn-primary" disabled={saving}>{saving ? "جاري الإنشاء…" : "إنشاء المنتج والوكيل"}</button><button type="button" className="btn-secondary" onClick={() => router.back()}>إلغاء</button></div>
      </form>
    </>
  );
}
