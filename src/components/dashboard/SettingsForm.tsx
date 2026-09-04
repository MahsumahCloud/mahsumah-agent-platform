"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiClientError } from "@/lib/dashboard/fetcher";
import type { FaqItem, PricingPlan, ProductProfile, PolicyItem } from "@/types";
import { ROLES } from "@/types";

type Tab = "persona" | "prompt" | "plans" | "faqs" | "policies" | "access";

export function SettingsForm({ initial }: { initial: ProductProfile }) {
  const router = useRouter();
  const [p, setP] = useState<ProductProfile>(initial);
  const [tab, setTab] = useState<Tab>("persona");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const res = await api<{ product: ProductProfile }>(`/api/v1/products/${p.id}`, { method: "PATCH", json: p });
      setP(res.product); setMsg({ ok: true, text: "تم الحفظ" }); router.refresh();
    } catch (err) { setMsg({ ok: false, text: err instanceof ApiClientError ? `${err.message} ${err.details ? JSON.stringify(err.details) : ""}` : "فشل الحفظ" }); }
    finally { setSaving(false); }
  }

  const tabs: { id: Tab; label: string }[] = [{ id: "persona", label: "الشخصية والنبرة" }, { id: "prompt", label: "تعليمات المنتج" }, { id: "plans", label: "الباقات" }, { id: "faqs", label: "الأسئلة الشائعة" }, { id: "policies", label: "السياسات" }, { id: "access", label: "الصلاحيات والثقة" }];

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="card h-fit p-2">
        {tabs.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`block w-full rounded-lg px-3 py-2 text-right text-sm ${tab === t.id ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}>{t.label}</button>)}
      </aside>
      <div className="card p-6">
        {tab === "persona" && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم المنتج"><input className="input" value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
              <Field label="الاسم الإنجليزي"><input className="input" dir="ltr" value={p.nameEn ?? ""} onChange={(e) => setP({ ...p, nameEn: e.target.value })} /></Field>
            </div>
            <Field label="وصف المنتج"><textarea className="input" rows={3} value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} /></Field>
            <Field label="الجمهور"><input className="input" value={p.audience} onChange={(e) => setP({ ...p, audience: e.target.value })} /></Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="اسم المساعد"><input className="input" value={p.persona.name} onChange={(e) => setP({ ...p, persona: { ...p.persona, name: e.target.value } })} /></Field>
              <Field label="دور المساعد"><input className="input" value={p.persona.role} onChange={(e) => setP({ ...p, persona: { ...p.persona, role: e.target.value } })} /></Field>
            </div>
            <Field label="النبرة"><input className="input" value={p.persona.tone} onChange={(e) => setP({ ...p, persona: { ...p.persona, tone: e.target.value } })} /></Field>
            <Field label="رسالة الترحيب (عربي)"><textarea className="input" rows={2} value={p.persona.greeting} onChange={(e) => setP({ ...p, persona: { ...p.persona, greeting: e.target.value } })} /></Field>
            <Field label="Greeting (English)"><textarea className="input" dir="ltr" rows={2} value={p.persona.greetingEn ?? ""} onChange={(e) => setP({ ...p, persona: { ...p.persona, greetingEn: e.target.value } })} /></Field>
            <ListField label="يستطيع المساعدة في" items={p.persona.canHelpWith} onChange={(v) => setP({ ...p, persona: { ...p.persona, canHelpWith: v } })} />
            <ListField label="ممنوع عليه (قيود صارمة)" items={p.persona.cannot} onChange={(v) => setP({ ...p, persona: { ...p.persona, cannot: v } })} />
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="اللغة الافتراضية"><select className="input" value={p.persona.defaultLocale} onChange={(e) => setP({ ...p, persona: { ...p.persona, defaultLocale: e.target.value as "ar" | "en" } })}><option value="ar">العربية</option><option value="en">English</option></select></Field>
              <Field label="لون الواجهة"><input className="input" type="color" value={p.theme.primaryColor} onChange={(e) => setP({ ...p, theme: { ...p.theme, primaryColor: e.target.value } })} /></Field>
              <Field label="عنوان الويدجت"><input className="input" value={p.theme.title ?? ""} onChange={(e) => setP({ ...p, theme: { ...p.theme, title: e.target.value } })} /></Field>
            </div>
            <div className="grid gap-4 md:grid-cols-[80px_1fr]">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                {p.theme.logoUrl ? <img src={p.theme.logoUrl} alt="" className="h-full w-full object-contain" /> : <span className="text-xl font-bold" style={{ color: p.theme.primaryColor }}>{p.name.slice(0, 1)}</span>}
              </div>
              <Field label="شعار المنتج (رابط؛ اتركه فارغاً لاستخدام شعار المؤسسة)"><input className="input" dir="ltr" placeholder="/brand/cloud.svg أو https://…" value={p.theme.logoUrl ?? ""} onChange={(e) => setP({ ...p, theme: { ...p.theme, logoUrl: e.target.value || undefined } })} /></Field>
            </div>
          </div>
        )}
        {tab === "prompt" && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">تعليمات تُضاف إلى البرمبت العام للمنصة وتخص هذا المنتج فقط. البرمبت العام وقواعد الأمان في <code>src/data/prompts/</code>.</p>
            <textarea className="input min-h-[320px] font-mono text-xs leading-6" value={p.productPrompt} onChange={(e) => setP({ ...p, productPrompt: e.target.value })} />
          </div>
        )}
        {tab === "plans" && <PlansEditor plans={p.plans} onChange={(plans) => setP({ ...p, plans })} />}
        {tab === "faqs" && <FaqEditor faqs={p.faqs} onChange={(faqs) => setP({ ...p, faqs })} />}
        {tab === "policies" && <PolicyEditor policies={p.policies} onChange={(policies) => setP({ ...p, policies })} />}
        {tab === "access" && (
          <div className="space-y-5">
            <div>
              <div className="label">الأدوار المسموح لها بمحادثة الوكيل</div>
              <div className="flex flex-wrap gap-2">
                {ROLES.map((r) => <label key={r} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${p.allowedRoles.includes(r) ? "border-brand-600 bg-brand-50 text-brand-700" : "border-slate-200 text-slate-500"}`}><input type="checkbox" className="hidden" checked={p.allowedRoles.includes(r)} onChange={(e) => setP({ ...p, allowedRoles: e.target.checked ? [...p.allowedRoles, r] : p.allowedRoles.filter((x) => x !== r) })} />{r}</label>)}
              </div>
            </div>
            <Field label={`الحد الأدنى للثقة: ${Math.round(p.confidenceThreshold * 100)}% — الإجابات الأقل تُعلَّم للمراجعة وتقترح التحويل للدعم`}>
              <input type="range" min={0} max={1} step={0.05} value={p.confidenceThreshold} onChange={(e) => setP({ ...p, confidenceThreshold: Number(e.target.value) })} className="w-full" />
            </Field>
            <div className="rounded-xl border border-slate-200 p-4">
              <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={p.access?.allowAnonymous ?? false} onChange={(e) => setP({ ...p, access: { allowAnonymous: e.target.checked, allowedOrigins: p.access?.allowedOrigins ?? [], anonymousRateLimit: p.access?.anonymousRateLimit ?? 15 } })} />السماح للزوار غير المسجلين (وضع الموقع العام)</label>
              <p className="mt-1 text-xs text-slate-500">الزائر يُعامل دائماً بدور <code>visitor</code>: يسأل عن المنتج والباقات والسياسات فقط، بلا أدوات حساب. بعد تسجيل الدخول يمرّر موقعك رمز مستخدم موقّعاً فيرتفع الدور تلقائياً.</p>
              {(p.access?.allowAnonymous ?? false) && (
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_160px]">
                  <Field label="النطاقات المسموح لها (سطر لكل نطاق، مثل https://mahsumaah.sa). فارغ = أي نطاق (للتطوير فقط)">
                    <textarea className="input" dir="ltr" rows={3} value={(p.access?.allowedOrigins ?? []).join("\n")} onChange={(e) => setP({ ...p, access: { ...(p.access ?? { allowAnonymous: true, anonymousRateLimit: 15 }), allowedOrigins: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) } })} />
                  </Field>
                  <Field label="طلبات/دقيقة لكل زائر"><input className="input" type="number" min={1} max={600} value={p.access?.anonymousRateLimit ?? 15} onChange={(e) => setP({ ...p, access: { ...(p.access ?? { allowAnonymous: true, allowedOrigins: [] }), anonymousRateLimit: Number(e.target.value) || 15 } })} /></Field>
                </div>
              )}
            </div>
            <Field label="حالة الوكيل"><select className="input" value={p.status} onChange={(e) => setP({ ...p, status: e.target.value as ProductProfile["status"] })}><option value="active">نشط</option><option value="disabled">معطّل</option></select></Field>
          </div>
        )}
        <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-4">
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "جاري الحفظ…" : "حفظ التغييرات"}</button>
          {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</span>}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div><label className="label">{label}</label>{children}</div>; }

function ListField({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  return <Field label={`${label} (سطر لكل عنصر)`}><textarea className="input" rows={3} value={items.join("\n")} onChange={(e) => onChange(e.target.value.split("\n").map((s) => s.trim()).filter(Boolean))} /></Field>;
}

function PlansEditor({ plans, onChange }: { plans: PricingPlan[]; onChange: (p: PricingPlan[]) => void }) {
  const update = (i: number, patch: Partial<PricingPlan>) => onChange(plans.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="space-y-4">
      {plans.length === 0 && <p className="text-sm text-slate-500">لا توجد باقات. الوكيل لن يذكر أي أسعار حتى تضيفها هنا.</p>}
      {plans.map((pl, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="المعرّف"><input className="input" dir="ltr" value={pl.id} onChange={(e) => update(i, { id: e.target.value })} /></Field>
            <Field label="الاسم"><input className="input" value={pl.name} onChange={(e) => update(i, { name: e.target.value })} /></Field>
            <Field label="السعر"><input className="input" type="number" value={pl.price} onChange={(e) => update(i, { price: Number(e.target.value) })} /></Field>
            <Field label="الدورة"><select className="input" value={pl.billingCycle} onChange={(e) => update(i, { billingCycle: e.target.value as PricingPlan["billingCycle"] })}><option value="monthly">شهري</option><option value="yearly">سنوي</option><option value="one-time">مرة واحدة</option></select></Field>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Field label="الوصف"><input className="input" value={pl.description} onChange={(e) => update(i, { description: e.target.value })} /></Field>
            <Field label="موصى بها لـ (فاصلة)"><input className="input" value={(pl.recommendedFor ?? []).join(", ")} onChange={(e) => update(i, { recommendedFor: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} /></Field>
          </div>
          <div className="mt-3"><ListField label="المزايا" items={pl.features} onChange={(features) => update(i, { features })} /></div>
          <button className="btn-danger mt-3" onClick={() => onChange(plans.filter((_, j) => j !== i))}>حذف الباقة</button>
        </div>
      ))}
      <button className="btn-secondary" onClick={() => onChange([...plans, { id: `plan-${plans.length + 1}`, name: "باقة جديدة", price: 0, currency: "SAR", billingCycle: "monthly", description: "", features: [] }])}>＋ إضافة باقة</button>
    </div>
  );
}

function FaqEditor({ faqs, onChange }: { faqs: FaqItem[]; onChange: (f: FaqItem[]) => void }) {
  const update = (i: number, patch: Partial<FaqItem>) => onChange(faqs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">تُفهرس الأسئلة الشائعة كمصدر معرفة قابل للاقتباس. بعد التعديل أعد فهرستها من صفحة قاعدة المعرفة.</p>
      {faqs.map((f, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4">
          <Field label="السؤال"><input className="input" value={f.question} onChange={(e) => update(i, { question: e.target.value })} /></Field>
          <div className="mt-2"><Field label="الإجابة"><textarea className="input" rows={2} value={f.answer} onChange={(e) => update(i, { answer: e.target.value })} /></Field></div>
          <button className="btn-danger mt-2" onClick={() => onChange(faqs.filter((_, j) => j !== i))}>حذف</button>
        </div>
      ))}
      <button className="btn-secondary" onClick={() => onChange([...faqs, { id: `faq-${Date.now()}`, question: "", answer: "" }])}>＋ إضافة سؤال</button>
    </div>
  );
}

function PolicyEditor({ policies, onChange }: { policies: PolicyItem[]; onChange: (p: PolicyItem[]) => void }) {
  const update = (i: number, patch: Partial<PolicyItem>) => onChange(policies.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="space-y-3">
      {policies.map((po, i) => (
        <div key={i} className="rounded-xl border border-slate-200 p-4">
          <Field label="العنوان"><input className="input" value={po.title} onChange={(e) => update(i, { title: e.target.value })} /></Field>
          <div className="mt-2"><Field label="النص"><textarea className="input" rows={3} value={po.content} onChange={(e) => update(i, { content: e.target.value })} /></Field></div>
          <button className="btn-danger mt-2" onClick={() => onChange(policies.filter((_, j) => j !== i))}>حذف</button>
        </div>
      ))}
      <button className="btn-secondary" onClick={() => onChange([...policies, { id: `policy-${Date.now()}`, title: "", content: "" }])}>＋ إضافة سياسة</button>
    </div>
  );
}
