"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { slug: "playground", label: "تجربة الوكيل" },
  { slug: "settings", label: "إعداد الوكيل" },
  { slug: "knowledge", label: "قاعدة المعرفة" },
  { slug: "tools", label: "الأدوات" },
  { slug: "conversations", label: "المحادثات والتحليلات" },
  { slug: "integrate", label: "الربط والتضمين" },
];

export function ProductTabs({ productId }: { productId: string }) {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-slate-200">
      {tabs.map((t) => {
        const href = `/products/${productId}/${t.slug}`;
        const active = path.startsWith(href);
        return <Link key={t.slug} href={href} className={`-mb-px border-b-2 px-4 py-2 text-sm ${active ? "border-brand-700 font-semibold text-brand-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{t.label}</Link>;
      })}
    </nav>
  );
}
