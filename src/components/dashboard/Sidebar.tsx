"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "المنتجات والوكلاء", icon: "▦" },
  { href: "/products/new", label: "إضافة منتج", icon: "＋" },
  { href: "/organization", label: "معرفة المؤسسة المشتركة", icon: "◈" },
];

export function Sidebar({ logoSrc }: { logoSrc: string }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() { await fetch("/api/v1/admin/logout", { method: "POST" }); router.replace("/login"); }
  return (
    <aside className="flex w-64 shrink-0 flex-col border-l border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-5 py-5">
        <img src={logoSrc} alt="" className="h-10 w-10 rounded-xl object-contain" />
        <div>
          <div className="text-sm font-bold">منصة الوكلاء</div>
          <div className="text-[11px] text-slate-500">Mahsumah Agent Platform</div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${path === l.href ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}>
            <span className="w-5 text-center">{l.icon}</span>{l.label}
          </Link>
        ))}
        <a href="/docs" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><span className="w-5 text-center">?</span>التوثيق</a>
      </nav>
      <div className="border-t border-slate-100 p-3">
        <button onClick={logout} className="btn-secondary w-full">تسجيل الخروج</button>
      </div>
    </aside>
  );
}
