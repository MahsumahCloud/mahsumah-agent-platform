import { redirect } from "next/navigation";
import { isAdminRequest } from "@/lib/auth/admin-session";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { getOrganization } from "@/lib/products/repository";
import { assetUrl } from "@/lib/branding";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdminRequest())) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <Sidebar logoSrc={assetUrl(getOrganization()?.theme.logoUrl) ?? assetUrl("/brand/mahsuma-logo.svg") ?? "/brand/mahsuma-logo.svg"} />
      <main className="flex-1 overflow-x-hidden p-8">{children}</main>
    </div>
  );
}
