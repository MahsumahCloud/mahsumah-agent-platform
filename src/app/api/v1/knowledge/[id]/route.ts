import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { fail, handleError, ok } from "@/lib/api/responses";
import { deleteSource, getSource } from "@/lib/rag/ingest";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); const s = getSource((await params).id); return s ? ok({ source: s }) : fail("not_found", "Source not found", 404); } catch (err) { return handleError(err); }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try { await requireAdmin(); await deleteSource((await params).id); return ok({ deleted: true }); } catch (err) { return handleError(err); }
}
