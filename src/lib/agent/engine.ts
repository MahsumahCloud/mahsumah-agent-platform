import { nanoid } from "nanoid";
import type { AgentContext, AgentRequest, AgentResponse, LlmMessage, RetrievedChunk, SuggestedAction, ToolCallRecord } from "@/types";
import { getLlmProvider } from "@/lib/llm";
import { retrieve, toCitations } from "@/lib/rag/retriever";
import { executeTool, resolveAvailableTools, toLlmSpec } from "@/lib/tools";
import { getOrganization, listProducts, requireProduct } from "@/lib/products/repository";
import { buildPrincipal } from "@/lib/tenancy/context";
import { buildPromptLayers, composeSystemPrompt } from "./prompt-builder";
import { assertRequestAllowed, detectLocale, extractMeta, mentionsOtherProduct, redactForeignIdentifiers, FALLBACK_ANSWERS, REFUSAL_ANSWERS } from "./guardrails";
import { computeConfidence } from "./confidence";
import { appendMessage, getHistory, getOrCreateConversation } from "./conversations";

const MAX_TOOL_ITERATIONS = 4;

/**
 * Core Agent Engine. One entry point: runAgent(request) → AgentResponse.
 * Pipeline: resolve product → resolve principal/RBAC → retrieve knowledge → compose prompt →
 * LLM loop with tool calls → guardrails → confidence → persist → respond.
 */
export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  const product = requireProduct(request.productId);
  const principal = buildPrincipal({ userId: request.userId, tenantId: request.tenantId, role: request.role, locale: request.locale, name: typeof request.metadata?.userName === "string" ? request.metadata.userName : undefined, email: typeof request.metadata?.userEmail === "string" ? request.metadata.userEmail : undefined });
  assertRequestAllowed(product, principal.role);

  const locale = request.locale ?? detectLocale(request.message, product.persona.defaultLocale);
  const conversation = getOrCreateConversation({ id: request.conversationId, productId: product.id, principal, locale, metadata: request.metadata });
  const history = conversation.isNew ? [] : getHistory(conversation.id);

  const availableTools = resolveAvailableTools({ product, principal });
  const ctx: AgentContext = { product, principal, locale, pageContext: request.pageContext, conversationId: conversation.id, requestId: nanoid(), availableToolIds: availableTools.map((t) => t.id) };

  appendMessage({ conversationId: conversation.id, productId: product.id, role: "user", content: request.message, pageContext: request.pageContext });

  // 1) Retrieval — scoped to the product at the storage layer.
  const chunks: RetrievedChunk[] = await retrieve(product.id, request.message, { topK: 6 });

  // 2) Prompt composition.
  const layers = buildPromptLayers(ctx, availableTools, chunks, { profile: getOrganization(), products: listProducts() });
  const system = composeSystemPrompt(layers);

  const messages: LlmMessage[] = [
    ...history.map((m): LlmMessage => ({ role: m.role, content: [{ type: "text", text: m.content }] })),
    { role: "user", content: [{ type: "text", text: request.message }] },
  ];

  // 3) LLM loop with tool execution.
  const llm = await getLlmProvider();
  const toolSpecs = availableTools.map(toLlmSpec);
  const toolCalls: ToolCallRecord[] = [];
  const usage = { inputTokens: 0, outputTokens: 0, model: llm.model };
  let finalText = "";
  let refused = false;

  for (let i = 0; i <= MAX_TOOL_ITERATIONS; i++) {
    const res = await llm.complete({ system, messages, tools: toolSpecs, maxTokens: 2048, groundingHint: { retrievedText: chunks.map((c) => c.content), locale } });
    usage.inputTokens += res.usage.inputTokens;
    usage.outputTokens += res.usage.outputTokens;
    usage.model = res.model;

    if (res.stopReason === "refusal") { refused = true; break; }

    const toolUses = res.content.filter((p) => p.type === "tool_use");
    const texts = res.content.filter((p) => p.type === "text").map((p) => (p.type === "text" ? p.text : ""));
    if (toolUses.length === 0 || i === MAX_TOOL_ITERATIONS) { finalText = texts.join("\n").trim(); break; }

    messages.push({ role: "assistant", content: res.content });
    const results: LlmMessage["content"] = [];
    for (const call of toolUses) {
      if (call.type !== "tool_use") continue;
      const started = Date.now();
      const outcome = await executeTool(call.name, call.input, ctx);
      const record: ToolCallRecord = { toolId: call.name, input: call.input, durationMs: Date.now() - started };
      if (outcome.ok) record.output = outcome.output; else record.error = `${outcome.code}: ${outcome.error}`;
      toolCalls.push(record);
      results.push({ type: "tool_result", toolUseId: call.id, content: outcome.ok ? JSON.stringify(outcome.output, null, 2) : `ERROR (${outcome.code}): ${outcome.error}`, isError: !outcome.ok });
    }
    messages.push({ role: "user", content: results });
  }

  // 4) Guardrails + confidence.
  const { answer: rawAnswer, meta } = extractMeta(finalText);
  let answer = rawAnswer || (refused ? REFUSAL_ANSWERS[locale] : FALLBACK_ANSWERS[locale]);
  answer = redactForeignIdentifiers(answer, ctx);
  const other = mentionsOtherProduct(product.id, request.message, listProducts());
  if (other) {
    answer += locale === "ar"
      ? `\n\nللتفاصيل الكاملة والأسعار الخاصة بـ ${other.name}، تواصل مع مساعد ${other.name}${other.website ? ` عبر ${other.website}` : ""}.`
      : `\n\nFor full details and pricing of ${other.nameEn ?? other.name}, please use the ${other.nameEn ?? other.name} assistant${other.website ? ` at ${other.website}` : ""}.`;
  }
  const confidence = refused ? 0 : computeConfidence(meta, chunks, toolCalls);
  const handoffRequired = refused || Boolean(meta?.handoff) || confidence < product.confidenceThreshold;
  // Citations: initial retrieval plus anything the model fetched itself via search_knowledge_base.
  const searched: RetrievedChunk[] = toolCalls
    .filter((t) => t.toolId === "search_knowledge_base" && !t.error)
    .flatMap((t) => ((t.output as { results?: { sourceId: string; chunkId: string; title: string; excerpt: string; score: number }[] } | undefined)?.results ?? []))
    .map((r) => ({ id: r.chunkId, sourceId: r.sourceId, productId: product.id, ordinal: 0, content: r.excerpt, tokenEstimate: 0, score: r.score, sourceTitle: r.title, sourceType: "text" as const }));
  const sources = meta?.usedSources === false ? [] : toCitations([...chunks, ...searched].sort((x, y) => y.score - x.score).slice(0, 5));
  const suggestedActions = buildSuggestedActions({ ctx, handoffRequired, toolCalls, chunks });

  // 5) Persist.
  const messageId = appendMessage({ conversationId: conversation.id, productId: product.id, role: "assistant", content: answer, confidence, sources, toolCalls, handoffRequired, usage });

  return { conversationId: conversation.id, messageId, answer, confidence, sources, suggestedActions, handoffRequired, toolCalls, locale, usage };
}

function buildSuggestedActions(args: { ctx: AgentContext; handoffRequired: boolean; toolCalls: ToolCallRecord[]; chunks: RetrievedChunk[] }): SuggestedAction[] {
  const { ctx, handoffRequired, toolCalls, chunks } = args;
  const ar = ctx.locale === "ar";
  const actions: SuggestedAction[] = [];
  const ticketCreated = toolCalls.find((t) => t.toolId === "create_support_ticket" && !t.error);
  if (ticketCreated) {
    const out = ticketCreated.output as { ticketId?: string } | undefined;
    actions.push({ type: "navigate", label: ar ? `متابعة التذكرة ${out?.ticketId ?? ""}` : `Track ticket ${out?.ticketId ?? ""}`, payload: { path: "/support/tickets", ticketId: out?.ticketId } });
  } else if (handoffRequired) {
    const canTicket = ctx.availableToolIds.includes("create_support_ticket");
    actions.push(canTicket ? { type: "open_ticket", label: ar ? "فتح تذكرة دعم" : "Open a support ticket", payload: { tool: "create_support_ticket" } } : { type: "contact_sales", label: ar ? "التواصل مع الفريق" : "Contact the team" });
  }
  const planSuggested = toolCalls.find((t) => t.toolId === "suggest_plan" && !t.error);
  if (planSuggested) {
    const top = (planSuggested.output as { recommendations?: { planId: string; planName: string }[] }).recommendations?.[0];
    if (top) actions.push({ type: "upgrade_plan", label: ar ? `عرض باقة ${top.planName}` : `View ${top.planName} plan`, payload: { planId: top.planId } });
  }
  const doc = chunks[0];
  if (doc?.sourceReference && /^https?:/.test(doc.sourceReference)) actions.push({ type: "view_docs", label: ar ? "فتح الوثيقة" : "Open documentation", payload: { url: doc.sourceReference } });
  return actions;
}
