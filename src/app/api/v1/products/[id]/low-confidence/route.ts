import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { handleError, ok } from "@/lib/api/responses";
import { listLowConfidenceAnswers } from "@/lib/agent/conversations";
import { requireProduct } from "@/lib/products/repository";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const { id } = await params; const p = requireProduct(id); return ok({ items: listLowConfidenceAnswers(id, p.confidenceThreshold) }); } catch (err) { return handleError(err); }
}
