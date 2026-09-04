import { z } from "zod";
import type { AgentContext, LlmToolSpec, ToolDefinition } from "@/types";
import { hasAllPermissions } from "@/lib/auth/rbac";

declare global {
  // eslint-disable-next-line no-var
  var __agentToolRegistry: Map<string, ToolDefinition> | undefined;
}

// Kept on globalThis so dev hot-reloads (which re-evaluate the definition modules) replace
// entries instead of duplicating or throwing.
const registry: Map<string, ToolDefinition> = globalThis.__agentToolRegistry ?? (globalThis.__agentToolRegistry = new Map());

export function registerTool<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(tool: ToolDefinition<I, O>): ToolDefinition<I, O> {
  registry.set(tool.id, tool as unknown as ToolDefinition);
  return tool;
}

export function getTool(id: string): ToolDefinition | undefined {
  return registry.get(id);
}

export function listTools(): ToolDefinition[] {
  return [...registry.values()];
}

/**
 * Tools the agent may use in this run = enabled for the product ∩ permitted for the role.
 * This is the single decision point; the engine never re-checks product config.
 */
export function resolveAvailableTools(ctx: Pick<AgentContext, "product" | "principal">): ToolDefinition[] {
  return listTools().filter((t) => ctx.product.enabledTools.includes(t.id) && hasAllPermissions(ctx.principal.role, t.requiredPermissions));
}

export function toLlmSpec(tool: ToolDefinition): LlmToolSpec {
  return { name: tool.id, description: tool.description, inputSchema: z.toJSONSchema(tool.inputSchema) as Record<string, unknown> };
}

export interface ToolExecutionResult { ok: true; output: unknown } 
export interface ToolExecutionFailure { ok: false; error: string; code: "not_found" | "not_enabled" | "forbidden" | "invalid_input" | "execution_error" }

export async function executeTool(id: string, rawInput: unknown, ctx: AgentContext): Promise<ToolExecutionResult | ToolExecutionFailure> {
  const tool = registry.get(id);
  if (!tool) return { ok: false, code: "not_found", error: `Unknown tool ${id}` };
  if (!ctx.availableToolIds.includes(id)) {
    const enabled = ctx.product.enabledTools.includes(id);
    return enabled
      ? { ok: false, code: "forbidden", error: `Role ${ctx.principal.role} lacks permission for ${id}` }
      : { ok: false, code: "not_enabled", error: `Tool ${id} is not enabled for product ${ctx.product.id}` };
  }
  const parsed = tool.inputSchema.safeParse(rawInput ?? {});
  if (!parsed.success) return { ok: false, code: "invalid_input", error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  try {
    const output = await tool.execute(parsed.data, ctx);
    const validated = tool.outputSchema.safeParse(output);
    if (!validated.success) return { ok: false, code: "execution_error", error: `Tool returned invalid output: ${validated.error.message}` };
    return { ok: true, output: validated.data };
  } catch (err) {
    return { ok: false, code: "execution_error", error: err instanceof Error ? err.message : String(err) };
  }
}
