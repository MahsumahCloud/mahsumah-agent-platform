import { redirect } from "next/navigation";

export default async function ProductIndex({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/products/${(await params).id}/playground`);
}
