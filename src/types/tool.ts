import type { z } from "zod";
import type { Permission } from "./auth";
import type { AgentContext } from "./agent";

export type ToolCategory = "account" | "product" | "knowledge" | "support" | "billing" | "onboarding";

export interface ToolDefinition<I extends z.ZodTypeAny = z.ZodTypeAny, O extends z.ZodTypeAny = z.ZodTypeAny> {
  id: string;
  description: string;
  category: ToolCategory;
  inputSchema: I;
  outputSchema: O;
  /** Permissions the principal must hold to invoke the tool. Empty = anyone who can chat. */
  requiredPermissions: Permission[];
  /** Tools that read/write account data; the agent must not call them for "general" questions. */
  requiresAccountContext: boolean;
  /** Whether the tool mutates external state (ticket creation etc.) - logged and surfaced as suggestedActions. */
  sideEffect: boolean;
  /** Real integrations implement this; mock implementations are the default MVP. */
  execute: (input: z.infer<I>, ctx: AgentContext) => Promise<z.infer<O>>;
}

export interface ToolCallRecord {
  toolId: string;
  input: unknown;
  output?: unknown;
  error?: string;
  durationMs: number;
}
