import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { handleError, ok } from "@/lib/api/responses";
import { listConversations } from "@/lib/agent/conversations";
import { requireProduct } from "@/lib/products/repository";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const product = requireProduct(id);
    const low = req.nextUrl.searchParams.get("lowConfidence") === "1";
    return ok({ conversations: listConversations(id, { lowConfidenceBelow: low ? product.confidenceThreshold : undefined }) });
  } catch (err) { return handleError(err); }
}
