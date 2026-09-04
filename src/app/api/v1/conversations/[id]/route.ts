import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/api/auth";
import { fail, handleError, ok } from "@/lib/api/responses";
import { getConversation } from "@/lib/agent/conversations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { await requireAdmin(); const c = getConversation((await params).id); return c ? ok(c) : fail("not_found", "Conversation not found", 404); } catch (err) { return handleError(err); }
}
