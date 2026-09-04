import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products/repository";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProduct((await params).id);
  if (!product) notFound();
  return <SettingsForm initial={product} />;
}
