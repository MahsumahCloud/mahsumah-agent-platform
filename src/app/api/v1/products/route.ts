import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { handleError, ok } from "@/lib/api/responses";
import { listProducts, upsertProduct } from "@/lib/products/repository";
import { createApiKey } from "@/lib/tenancy/api-keys";

export async function GET() {
  try { await requireAdmin(); return ok({ products: listProducts() }); } catch (err) { return handleError(err); }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const product = upsertProduct(await req.json());
    const { raw } = createApiKey(product.id, "default");
    return ok({ product, apiKey: raw }, { status: 201 });
  } catch (err) { return handleError(err); }
}
