import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganization, getProduct } from "@/lib/products/repository";
import { assetUrl } from "@/lib/branding";
import { ProductTabs } from "@/components/dashboard/ProductTabs";

export default async function ProductLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product || product.kind === "organization") notFound();
  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm text-slate-400 hover:text-slate-700">المنتجات</Link>
          <span className="text-slate-300">/</span>
          {assetUrl(product.theme.logoUrl ?? getOrganization()?.theme.logoUrl) ? <img src={assetUrl(product.theme.logoUrl ?? getOrganization()?.theme.logoUrl)} alt="" className="h-9 w-9 rounded-lg object-contain" /> : <div className="flex h-9 w-9 items-center justify-center rounded-lg text-white" style={{ background: product.theme.primaryColor }}>{product.name.slice(0, 1)}</div>}
          <div><div className="font-bold">{product.name}</div><div className="text-xs text-slate-500">{product.persona.name}</div></div>
        </div>
        <span className={`badge ${product.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>{product.status === "active" ? "نشط" : "معطّل"}</span>
      </div>
      <ProductTabs productId={product.id} />
      <div className="mt-6">{children}</div>
    </>
  );
}
