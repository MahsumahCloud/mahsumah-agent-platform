import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { fail, handleError, ok } from "@/lib/api/responses";
import { deleteProduct, getProduct, patchProduct } from "@/lib/products/repository";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const product = getProduct((await params).id);
    return product ? ok({ product }) : fail("product_not_found", "Product not found", 404);
  } catch (err) { return handleError(err); }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    const patch = (await req.json()) as Record<string, unknown>;
    delete patch.id;
    return ok({ product: patchProduct(id, patch) });
  } catch (err) { return handleError(err); }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); deleteProduct((await params).id); return ok({ deleted: true }); } catch (err) { return handleError(err); }
}
