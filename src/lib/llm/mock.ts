import type { LlmProvider, LlmRequest, LlmResponse } from "@/types";

/**
 * Deterministic provider for local development, CI and demos.
 * It never invents facts: it answers strictly from the grounding hint (retrieved chunks)
 * or from tool results, and emits the same <meta> block the real prompt asks real models
 * to emit, so confidence, handoff and citations are exercised end-to-end.
 */
export class MockProvider implements LlmProvider {
  readonly id = "mock";
  readonly model = "mock-grounded-v1";

  async complete(req: LlmRequest): Promise<LlmResponse> {
    const locale = req.groundingHint?.locale ?? "ar";
    const ar = locale === "ar";
    const lastUser = [...req.messages].reverse().find((m) => m.role === "user");
    const lastText = lastUser?.content.find((p) => p.type === "text");
    const question = lastText && lastText.type === "text" ? lastText.text : "";

    // Summarise a tool result (the previous assistant turn holds the tool name).
    const toolResult = lastUser?.content.find((p) => p.type === "tool_result");
    if (toolResult && toolResult.type === "tool_result") {
      const prevAssistant = [...req.messages].reverse().find((m) => m.role === "assistant");
      const call = prevAssistant?.content.find((p) => p.type === "tool_use" && p.id === toolResult.toolUseId);
      const toolName = call && call.type === "tool_use" ? call.name : "tool";
      if (toolResult.isError) {
        return this.text(ar ? "لم أتمكن من تنفيذ هذا الطلب بسبب الصلاحيات أو خطأ في الخدمة. يمكنك التواصل مع مسؤول الحساب أو فتح تذكرة دعم." : "I couldn't complete this request due to permissions or a service error. Please contact your account admin or open a support ticket.", 0.4, true);
      }
      return this.text(summariseTool(toolName, safeJson(toolResult.content), ar), 0.85, false);
    }

    const tools = new Set(req.tools.map((t) => t.name));
    const q = question.toLowerCase();

    // Small talk / meta questions: answer from the persona in the system prompt, no knowledge needed.
    const persona = req.system.match(/## شخصية المساعد\n(?:.*\n)*?الاسم: (.+)/)?.[1]?.trim() ?? "المساعد";
    const canHelp = req.system.match(/تستطيع المساعدة في: (.+)/)?.[1]?.trim() ?? "";
    const trimmed = q.replace(/[!؟?.،,\s]+$/g, "").trim();
    if (/^(هلا|هلا والله|مرحبا|مرحباً|أهلا|أهلاً|السلام عليكم|سلام|صباح الخير|مساء الخير|هاي|hi|hello|hey|good (morning|evening))(\s+\S+){0,3}$/.test(trimmed)) {
      return this.text(ar ? `أهلاً وسهلاً! أنا ${persona}. ${canHelp ? `أقدر أساعدك في: ${canHelp}.` : ""} اسألني ما تريد.` : `Hello! I'm ${persona}. ${canHelp ? `I can help with: ${canHelp}.` : ""} Ask me anything.`, 0.9, false, false);
    }
    if (/^(شكرا|شكراً|مشكور|يعطيك العافية|thanks|thank you|تسلم)(\s+\S+){0,3}$/.test(trimmed)) {
      return this.text(ar ? "العفو! إذا احتجت أي شيء آخر أنا هنا." : "You're welcome! I'm here if you need anything else.", 0.9, false, false);
    }
    if (/(من أنت|من انت|مين انت|وش تقدر تسوي|ايش تقدر تسوي|كيف تساعدني|وش تسوي|what can you do|who are you)/.test(q)) {
      return this.text(ar ? `أنا ${persona}، مساعد آلي.${canHelp ? ` أقدر أساعدك في: ${canHelp}.` : ""} أجيب من وثائق المنتج الرسمية، وإذا احتجت شيئاً خارجها أوجّهك لفريق الدعم.` : `I'm ${persona}, an AI assistant.${canHelp ? ` I can help with: ${canHelp}.` : ""} I answer from official product documentation and route you to support otherwise.`, 0.9, false, false);
    }
    if (/^(مع السلامة|باي|bye|وداعا|وداعاً)$/.test(trimmed)) {
      return this.text(ar ? "مع السلامة، سعدت بخدمتك." : "Goodbye, happy to help.", 0.9, false, false);
    }

    // Route obvious intents to tools (mirrors what a real model would do with the same prompt).
    const call = (name: string, input: unknown): LlmResponse => ({ content: [{ type: "tool_use", id: `mock_${name}`, name, input }], stopReason: "tool_use", usage: { inputTokens: 0, outputTokens: 0 }, model: this.model });
    if (/تذكرة|ticket/.test(q) && /افتح|فتح|create|open|أريد|ابي|ابغى|سجل/.test(q) && tools.has("create_support_ticket")) return call("create_support_ticket", { subject: question.replace(/^.*?(تذكرة|ticket)\s*(دعم)?\s*:?\s*/i, "").slice(0, 100) || question.slice(0, 100), description: question, priority: /عاجل|urgent/.test(q) ? "urgent" : "normal" });
    if (/باقة|plan|pricing|سعر|أسعار|اشتراك/.test(q) && /أفضل|مناسب|best|suggest|recommend|اقترح|انسب|أنسب/.test(q) && tools.has("suggest_plan")) return call("suggest_plan", { needs: question });
    if (/فاتورة|فواتير|billing|invoice|رصيد|اشتراكي الحالي/.test(q) && tools.has("fetch_billing_summary")) return call("fetch_billing_summary", {});
    if (/حالة (المشروع|النشر|مشروعي)|project status|deploy(ment)? (status|failed)|النشر فشل|فشل النشر/.test(q) && tools.has("check_project_status")) return call("check_project_status", {});
    if (/(قائمة|خطوات|checklist) (البدء|التهيئة|onboarding)|onboarding|كيف أبدأ|ابدأ من وين/.test(q) && tools.has("create_onboarding_checklist")) return call("create_onboarding_checklist", { goal: question, technicalLevel: "developer" });
    if (/^(من أنا|who am i|بياناتي|حسابي)\??$/.test(q.trim()) && tools.has("get_current_user")) return call("get_current_user", {});
    if (/(كم|ما هي|what are|list)\s.*(الباقات|الأسعار|plans|pricing)/.test(q) && tools.has("get_pricing_plans")) return call("get_pricing_plans", {});

    const chunks = req.groundingHint?.retrievedText ?? [];
    const strong = chunks.length > 0 && chunkMatches(question, chunks[0] ?? "");
    if (!strong) {
      return this.text(ar ? "لا أملك معلومة مؤكدة عن هذا السؤال في قاعدة المعرفة الحالية. أنصح بفتح تذكرة دعم ليتابعها فريقنا معك." : "I don't have verified information about this in the current knowledge base. I recommend opening a support ticket so our team can follow up.", 0.2, true);
    }
    const intro = ar ? "بناءً على وثائق المنتج:" : "Based on the product documentation:";
    return this.text(`${intro}\n\n${chunks.slice(0, 2).map((c) => c.trim()).join("\n\n")}`, 0.75, false);
  }

  private text(body: string, confidence: number, handoff: boolean, usedSources = !handoff): LlmResponse {
    return { content: [{ type: "text", text: `${body}\n\n<meta>${JSON.stringify({ confidence, handoff, usedSources })}</meta>` }], stopReason: "end_turn", usage: { inputTokens: 0, outputTokens: 0 }, model: this.model };
  }
}

function chunkMatches(question: string, chunk: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").replace(/[^\p{L}\p{N}\s]/gu, " ");
  const stem = (w: string) => w.replace(/^(وال|بال|فال|كال|لل|ال|و|ب|ف|ل|س|ا)/, "").replace(/(ات|ون|ين|ها|هم|كم|نا|ه|ك|ي)$/, "");
  const terms = norm(question).split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t)).map(stem).filter((t) => t.length >= 3);
  if (terms.length === 0) return false;
  const bodyWords = norm(chunk).split(/\s+/).map(stem);
  const hits = terms.filter((t) => bodyWords.some((w) => w.startsWith(t.slice(0, 4)) || t.startsWith(w.slice(0, 4)))).length;
  return hits / terms.length >= 0.3;
}
const STOP = new Set(["كيف", "ماذا", "هل", "ما", "من", "في", "على", "الى", "إلى", "عن", "مع", "هذا", "هذه", "the", "what", "how", "can", "and", "for", "with", "you", "your", "does", "are", "is", "أريد", "ابي", "ابغى"]);

function safeJson(s: string): unknown { try { return JSON.parse(s); } catch { return s; } }

function summariseTool(tool: string, out: unknown, ar: boolean): string {
  const o = (out ?? {}) as Record<string, unknown>;
  switch (tool) {
    case "suggest_plan": {
      const recs = (o.recommendations as { planName: string; price: number; currency: string; reasons: string[] }[] | undefined) ?? [];
      const top = recs[0];
      if (!top) return ar ? "لم أجد باقة مناسبة بناءً على المعطيات." : "No suitable plan found.";
      const lines = recs.slice(0, 3).map((r, i) => `${i + 1}. **${r.planName}** — ${r.price} ${r.currency}${ar ? "/شهر" : "/mo"}: ${r.reasons.join("، ")}`);
      return (ar ? `الباقة الأنسب لك غالباً هي **${top.planName}**.\n\nالترتيب حسب احتياجك:\n` : `The most suitable plan is likely **${top.planName}**.\n\nRanked for your needs:\n`) + lines.join("\n");
    }
    case "create_support_ticket":
      return ar ? `تم فتح تذكرة الدعم **${o.ticketId}** بموضوع "${o.subject}" (أولوية: ${o.priority}). الرد المتوقع ${o.estimatedResponse}.` : `Support ticket **${o.ticketId}** created for "${o.subject}" (priority: ${o.priority}). Expected response: ${o.estimatedResponse}.`;
    case "fetch_billing_summary":
      return ar ? `باقتك الحالية: **${o.currentPlan}** (الحالة: ${o.status}).\nالفاتورة القادمة: ${o.nextInvoiceAmount} ${o.currency} بتاريخ ${o.nextInvoiceDate}.\nالرصيد المستحق: ${o.outstandingBalance} ${o.currency}.` : `Current plan: **${o.currentPlan}** (${o.status}).\nNext invoice: ${o.nextInvoiceAmount} ${o.currency} on ${o.nextInvoiceDate}.\nOutstanding balance: ${o.outstandingBalance} ${o.currency}.`;
    case "check_project_status": {
      const projects = (o.projects as { name: string; status: string; framework: string; lastError?: string }[] | undefined) ?? [];
      const lines = projects.map((p) => `- **${p.name}** (${p.framework}): ${p.status}${p.lastError ? ` — ${p.lastError}` : ""}`);
      const failed = projects.find((p) => p.status === "failed");
      const tip = failed ? (ar ? "\n\nالخطوة التالية: أضف المتغير الناقص من تبويب Environment ثم أعد النشر." : "\n\nNext step: add the missing variable in the Environment tab and redeploy.") : "";
      return (ar ? "حالة مشاريعك:\n" : "Your projects:\n") + lines.join("\n") + tip;
    }
    case "create_onboarding_checklist": {
      const items = (o.checklist as { step: string }[] | undefined) ?? [];
      return (ar ? "قائمة البدء المقترحة لك:\n" : "Your onboarding checklist:\n") + items.map((i, n) => `${n + 1}. ${i.step}`).join("\n");
    }
    case "get_pricing_plans": {
      const plans = (o.plans as { name: string; price: number; currency: string; description: string }[] | undefined) ?? [];
      return (ar ? "الباقات الرسمية:\n" : "Official plans:\n") + plans.map((p) => `- **${p.name}**: ${p.price} ${p.currency} — ${p.description}`).join("\n");
    }
    case "get_current_user":
      return ar ? `أنت مسجّل بدور **${o.role}** ضمن الحساب ${o.tenantId}.` : `You are signed in as **${o.role}** in account ${o.tenantId}.`;
    default:
      return (ar ? "نتيجة الأداة:\n" : "Tool result:\n") + "```\n" + JSON.stringify(out, null, 2) + "\n```";
  }
}
