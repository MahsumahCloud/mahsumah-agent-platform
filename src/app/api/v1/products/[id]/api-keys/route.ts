import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/api/auth";
import { handleError, ok } from "@/lib/api/responses";
import { requireProduct } from "@/lib/products/repository";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/tenancy/api-keys";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); const { id } = await params; requireProduct(id); return ok({ keys: listApiKeys(id) }); } catch (err) { return handleError(err); }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const { id } = await params;
    requireProduct(id);
    const { label } = z.object({ label: z.string().min(1).max(60).default("key") }).parse(await req.json().catch(() => ({})));
    const { raw, record } = createApiKey(id, label);
    return ok({ key: record, raw }, { status: 201 });
  } catch (err) { return handleError(err); }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await params;
    const { keyId } = z.object({ keyId: z.string() }).parse(await req.json());
    revokeApiKey(keyId);
    return ok({ revoked: true });
  } catch (err) { return handleError(err); }
}
