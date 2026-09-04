export type LlmRole = "user" | "assistant";

export interface LlmTextPart { type: "text"; text: string }
export interface LlmToolUsePart { type: "tool_use"; id: string; name: string; input: unknown }
export interface LlmToolResultPart { type: "tool_result"; toolUseId: string; content: string; isError?: boolean }

export type LlmContentPart = LlmTextPart | LlmToolUsePart | LlmToolResultPart;

export interface LlmMessage {
  role: LlmRole;
  content: LlmContentPart[];
}

export interface LlmToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools: LlmToolSpec[];
  maxTokens?: number;
  /** Used by mock provider only, to ground its deterministic answer. */
  groundingHint?: { retrievedText: string[]; locale: "ar" | "en" };
}

export interface LlmResponse {
  content: LlmContentPart[];
  stopReason: "end_turn" | "tool_use" | "max_tokens" | "refusal" | "other";
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

export interface LlmProvider {
  readonly id: string;
  readonly model: string;
  complete(req: LlmRequest): Promise<LlmResponse>;
}

export interface EmbeddingProvider {
  readonly id: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}
