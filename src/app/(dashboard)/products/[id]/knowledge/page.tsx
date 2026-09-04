import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products/repository";
import { listSources } from "@/lib/rag/ingest";
import { KnowledgeManager } from "@/components/dashboard/KnowledgeManager";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = getProduct(id);
  if (!product) notFound();
  return <KnowledgeManager productId={id} initialSources={listSources(id)} faqCount={product.faqs.length} />;
}
