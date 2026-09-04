import Script from "next/script";
import { getProduct, listProducts } from "@/lib/products/repository";

export const dynamic = "force-dynamic";

/** Public demo host page: shows what an embedding product's page looks like with the widget. */
export default async function DemoPage({ searchParams }: { searchParams: Promise<{ productId?: string; locale?: string; role?: string }> }) {
  const sp = await searchParams;
  const product = getProduct(sp.productId ?? "") ?? listProducts()[0];
  if (!product) return <main className="p-10">لا توجد منتجات. شغّل npm run db:seed.</main>;
  const locale = sp.locale === "en" ? "en" : "ar";
  return (
    <main className="min-h-screen bg-slate-100 p-10" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl text-white" style={{ background: product.theme.primaryColor }}>{product.name.slice(0, 1)}</div><div><div className="font-bold">{product.name}</div><div className="text-xs text-slate-500">صفحة تجريبية تحاكي لوحة تحكم المنتج المضيف</div></div></div>
        <div className="grid gap-4 md:grid-cols-3">{["المشاريع", "الفوترة", "الإعدادات"].map((t) => <div key={t} className="h-28 rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-400">{t}</div>)}</div>
        <p className="mt-6 text-sm text-slate-500">الويدجت في الزاوية يقرأ إعدادات <b>{product.name}</b> ويرسل السياق (الصفحة، الدور، المستخدم). جرّب: <a className="underline" href={`/demo?productId=${product.id}&locale=${locale === "ar" ? "en" : "ar"}`}>{locale === "ar" ? "English" : "العربية"}</a> · {listProducts().filter((p) => p.id !== product.id).map((p) => <a key={p.id} className="underline" href={`/demo?productId=${p.id}`}>{p.name}</a>)}</p>
      </div>
      {/* The demo runs under the admin session so no API key is embedded here. Real products pass data-api-key or proxy through their backend. */}
      <Script src="/widget.js" strategy="afterInteractive" data-product-id={product.id} data-tenant-id="company_123" data-user-id="user_456" data-role={sp.role ?? "customer_admin"} data-locale={locale} data-page-context={JSON.stringify({ path: "/dashboard/projects", projectType: "nextjs" })} />
    </main>
  );
}
