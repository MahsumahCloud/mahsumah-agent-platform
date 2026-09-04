import { notFound } from "next/navigation";
import { getProduct } from "@/lib/products/repository";
import { Playground } from "@/components/dashboard/Playground";

export const dynamic = "force-dynamic";

export default async function PlaygroundPage({ params }: { params: Promise<{ id: string }> }) {
  const product = getProduct((await params).id);
  if (!product) notFound();
  return <Playground product={product} />;
}
