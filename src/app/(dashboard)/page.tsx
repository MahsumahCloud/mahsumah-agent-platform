import Link from "next/link";
import { listProducts } from "@/lib/products/repository";
import { productAnalytics } from "@/lib/agent/conversations";
import { listSources } from "@/lib/rag/ingest";
import { EmptyState, PageHeader } from "@/components/ui";
import { getOrganization } from "@/lib/products/repository";
import { assetUrl } from "@/lib/branding";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const products = listProducts();
  const orgLogo = getOrganization()?.theme.logoUrl;
  return (
    <>
      <PageHeader title="المنتجات والوكلاء" subtitle="كل منتج له وكيل مستقل بمعرفته وأدواته وشخصيته." actions={<Link href="/products/new" className="btn-primary">＋ إضافة منتج</Link>} />
      {products.length === 0 ? (
        <EmptyState title="لا توجد منتجات بعد" description="أضف أول منتج لتوليد وكيل ذكي له، أو شغّل npm run db:seed لتحميل المنتجات التجريبية." action={<Link href="/products/new" className="btn-primary">إضافة منتج</Link>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.map((p) => {
            const a = productAnalytics(p.id, p.confidenceThreshold);
            const sources = listSources(p.id);
            return (
              <Link key={p.id} href={`/products/${p.id}/playground`} className="card group p-5 transition hover:border-brand-500">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {assetUrl(p.theme.logoUrl ?? orgLogo) ? <img src={assetUrl(p.theme.logoUrl ?? orgLogo)} alt="" className="h-11 w-11 rounded-xl object-contain" /> : <div className="flex h-11 w-11 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ background: p.theme.primaryColor }}>{p.name.slice(0, 1)}</div>}
                    <div>
                      <div className="font-bold group-hover:text-brand-700">{p.name}</div>
                      <div className="text-xs text-slate-500">{p.persona.name}</div>
                    </div>
                  </div>
                  <span className={`badge ${p.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{p.status === "active" ? "نشط" : "معطّل"}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">{p.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold text-slate-900">{sources.length}</div><div className="text-slate-500">مصادر معرفة</div></div>
                  <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold text-slate-900">{a.conversations}</div><div className="text-slate-500">محادثات</div></div>
                  <div className="rounded-lg bg-slate-50 p-2"><div className="font-bold text-slate-900">{a.avgConfidence !== null ? `${Math.round(a.avgConfidence * 100)}%` : "—"}</div><div className="text-slate-500">متوسط الثقة</div></div>
                </div>
                <div className="mt-3 text-xs text-slate-400">{p.enabledTools.length} أداة مفعّلة · الحد الأدنى للثقة {Math.round(p.confidenceThreshold * 100)}%</div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
