import { requireAdmin } from "@/lib/api/auth";
import { handleError, ok } from "@/lib/api/responses";
import { listTools } from "@/lib/tools";
import { z } from "zod";

export async function GET() {
  try {
    await requireAdmin();
    return ok({ tools: listTools().map((t) => ({ id: t.id, description: t.description, category: t.category, requiredPermissions: t.requiredPermissions, requiresAccountContext: t.requiresAccountContext, sideEffect: t.sideEffect, inputSchema: z.toJSONSchema(t.inputSchema), outputSchema: z.toJSONSchema(t.outputSchema) })) });
  } catch (err) { return handleError(err); }
}
