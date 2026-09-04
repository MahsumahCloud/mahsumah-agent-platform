import type { LlmContentPart, LlmMessage, LlmProvider, LlmRequest, LlmResponse } from "@/types";

/**
 * OpenAI Chat Completions adapter (raw fetch to avoid an extra SDK dependency).
 * Maps the provider-neutral LlmMessage shape onto OpenAI's tool-calling format.
 */
interface OaiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

function toOaiMessages(system: string, messages: LlmMessage[]): OaiMessage[] {
  const out: OaiMessage[] = [{ role: "system", content: system }];
  for (const m of messages) {
    if (m.role === "assistant") {
      const text = m.content.filter((p) => p.type === "text").map((p) => (p.type === "text" ? p.text : "")).join("\n");
      const calls = m.content.filter((p) => p.type === "tool_use");
      out.push({
        role: "assistant",
        content: text || null,
        tool_calls: calls.length
          ? calls.map((c) => (c.type === "tool_use" ? { id: c.id, type: "function" as const, function: { name: c.name, arguments: JSON.stringify(c.input) } } : null)).filter((c): c is NonNullable<typeof c> => c !== null)
          : undefined,
      });
    } else {
      for (const p of m.content) {
        if (p.type === "text") out.push({ role: "user", content: p.text });
        else if (p.type === "tool_result") out.push({ role: "tool", content: p.content, tool_call_id: p.toolUseId });
      }
    }
  }
  return out;
}

export class OpenAiProvider implements LlmProvider {
  readonly id = "openai";
  readonly model: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: { apiKey: string; model?: string; baseUrl?: string }) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? "gpt-4o";
    this.baseUrl = opts.baseUrl ?? "https://api.openai.com/v1";
  }

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 4096,
        messages: toOaiMessages(req.system, req.messages),
        tools: req.tools.length
          ? req.tools.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.inputSchema } }))
          : undefined,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as {
      model: string;
      usage?: { prompt_tokens: number; completion_tokens: number };
      choices: { finish_reason: string; message: OaiMessage }[];
    };
    const choice = json.choices[0];
    if (!choice) throw new Error("OpenAI returned no choices");
    const content: LlmContentPart[] = [];
    if (choice.message.content) content.push({ type: "text", text: choice.message.content });
    for (const c of choice.message.tool_calls ?? []) {
      let input: unknown = {};
      try { input = JSON.parse(c.function.arguments); } catch { input = {}; }
      content.push({ type: "tool_use", id: c.id, name: c.function.name, input });
    }
    return {
      content,
      stopReason: choice.finish_reason === "tool_calls" ? "tool_use" : choice.finish_reason === "length" ? "max_tokens" : "end_turn",
      usage: { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 },
      model: json.model,
    };
  }
}
