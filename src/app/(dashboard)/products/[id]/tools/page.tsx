import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products/repository";
import { listTools } from "@/lib/tools";
import { ToolsManager } from "@/components/dashboard/ToolsManager";

export const dynamic = "force-dynamic";

export default async function ToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProduct((await params).id);
  if (!product) notFound();
  const tools = listTools().map((t) => ({ id: t.id, description: t.description, category: t.category, requiredPermissions: t.requiredPermissions, requiresAccountContext: t.requiresAccountContext, sideEffect: t.sideEffect }));
  return <ToolsManager productId={product.id} enabled={product.enabledTools} tools={tools} />;
}
