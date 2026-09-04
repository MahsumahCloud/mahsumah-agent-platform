import Anthropic from "@anthropic-ai/sdk";
import type { LlmContentPart, LlmMessage, LlmProvider, LlmRequest, LlmResponse } from "@/types";

function toSdkMessages(messages: LlmMessage[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content.map((p): Anthropic.ContentBlockParam => {
      if (p.type === "text") return { type: "text", text: p.text };
      if (p.type === "tool_use") return { type: "tool_use", id: p.id, name: p.name, input: p.input as Record<string, unknown> };
      return { type: "tool_result", tool_use_id: p.toolUseId, content: p.content, is_error: p.isError };
    }),
  }));
}

function fromSdkContent(content: Anthropic.ContentBlock[]): LlmContentPart[] {
  const parts: LlmContentPart[] = [];
  for (const block of content) {
    if (block.type === "text") parts.push({ type: "text", text: block.text });
    else if (block.type === "tool_use") parts.push({ type: "tool_use", id: block.id, name: block.name, input: block.input });
  }
  return parts;
}

export class AnthropicProvider implements LlmProvider {
  readonly id = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(opts: { apiKey?: string; model?: string } = {}) {
    this.client = new Anthropic(opts.apiKey ? { apiKey: opts.apiKey } : {});
    this.model = opts.model ?? "claude-opus-5";
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const tools: Anthropic.Tool[] = req.tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
    }));

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: req.maxTokens ?? 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium" },
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      tools,
      messages: toSdkMessages(req.messages),
    });

    const stopReason: LlmResponse["stopReason"] =
      response.stop_reason === "tool_use"
        ? "tool_use"
        : response.stop_reason === "max_tokens"
          ? "max_tokens"
          : response.stop_reason === "refusal"
            ? "refusal"
            : response.stop_reason === "end_turn"
              ? "end_turn"
              : "other";

    return {
      content: fromSdkContent(response.content),
      stopReason,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
      model: response.model,
    };
  }
}
