import fs from "node:fs";
import path from "node:path";
import type { AgentContext, ProductProfile, RetrievedChunk, ToolDefinition } from "@/types";

const PROMPTS_DIR = path.join(process.cwd(), "src", "data", "prompts");
const cache = new Map<string, string>();

function readPrompt(rel: string): string {
  const key = rel;
  if (process.env.NODE_ENV === "production" && cache.has(key)) return cache.get(key)!;
  const file = path.join(PROMPTS_DIR, rel);
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8").trim() : "";
  cache.set(key, text);
  return text;
}

function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? "");
}

export interface PromptLayers {
  platform: string;
  organization: string;
  product: string;
  role: string;
  safety: string;
  tools: string;
  formatting: string;
  knowledge: string;
  context: string;
}

/**
 * Composes the final system prompt from independent layers. Layer order matters for
 * caching: stable layers (platform, product, role, safety, tools, formatting) come first,
 * volatile layers (retrieved knowledge, page context) come last.
 */
export interface OrganizationContext { profile: ProductProfile | undefined; products: ProductProfile[] }

export function buildPromptLayers(ctx: AgentContext, tools: ToolDefinition[], chunks: RetrievedChunk[], org: OrganizationContext = { profile: undefined, products: [] }): PromptLayers {
  const p = ctx.product;
  const vars = { PRODUCT_NAME: p.name, PRODUCT_ID: p.id };

  const orgLayer = org.profile
    ? interpolate(readPrompt("organization.md"), {
        ...vars,
        ORG_NAME: org.profile.name,
        ORG_DESCRIPTION: [org.profile.description, org.profile.productPrompt].filter(Boolean).join("\n"),
        PRODUCT_DIRECTORY: org.products.filter((x) => x.kind !== "organization").map((x) => `- ${x.name}${x.nameEn ? ` (${x.nameEn})` : ""}${x.id === p.id ? " ← المنتج الحالي" : ""}: ${x.description}${x.website ? ` — ${x.website}` : ""}`).join("\n") || "- لا توجد منتجات أخرى مسجلة.",
      })
    : "";

  const productLayer = [
    `## تعريف المنتج`,
    `الاسم: ${p.name}${p.nameEn ? ` (${p.nameEn})` : ""}`,
    `الوصف: ${p.description}`,
    `الجمهور: ${p.audience}`,
    p.website ? `الموقع: ${p.website}` : "",
    ``,
    `## شخصية المساعد`,
    `الاسم: ${p.persona.name}`,
    `الدور: ${p.persona.role}`,
    `النبرة: ${p.persona.tone}`,
    `تستطيع المساعدة في: ${p.persona.canHelpWith.join("، ")}`,
    `لا تستطيع/يُمنع: ${p.persona.cannot.join("، ")}`,
    ``,
    p.productPrompt ? `## تعليمات خاصة بالمنتج\n${p.productPrompt}` : "",
    ``,
    `## الباقات الرسمية (المصدر الوحيد للأسعار)`,
    ...p.plans.map((pl) => `- ${pl.name}: ${pl.price} ${pl.currency}/${pl.billingCycle === "monthly" ? "شهرياً" : pl.billingCycle === "yearly" ? "سنوياً" : "مرة واحدة"} — ${pl.description}. المزايا: ${pl.features.join("، ")}`),
    ``,
    p.policies.length ? `## السياسات\n${p.policies.map((po) => `- ${po.title}: ${po.content}`).join("\n")}` : "",
  ].filter((l) => l !== undefined).join("\n");

  const roleLayer = readPrompt(`roles/${ctx.principal.role}.md`) || readPrompt("roles/visitor.md");

  const toolsLayer = tools.length
    ? `${readPrompt("tool-use.md")}\n\nالأدوات المتاحة في هذه المحادثة: ${tools.map((t) => `${t.id}${t.sideEffect ? " (إجراء)" : ""}`).join("، ")}`
    : "لا توجد أدوات متاحة في هذه المحادثة. أجب من المعرفة المرفقة فقط.";

  const knowledgeLayer = chunks.length
    ? `## معرفة مسترجعة (وثائق ${p.name} + المعرفة المشتركة للمؤسسة؛ استخدمها كمصدر أساسي واذكر عنوان المصدر)\n` +
      chunks.map((c, i) => `[المصدر ${i + 1}${c.productId !== p.id ? " — معرفة مشتركة" : ""}: ${c.sourceTitle}${c.heading ? ` › ${c.heading}` : ""}]\n${c.content}`).join("\n\n---\n\n")
    : `## معرفة مسترجعة\nلم يتم العثور على وثائق مرتبطة بهذا السؤال. إذا لم تكن الإجابة في تعريف المنتج أو الباقات أو السياسات أعلاه، فقل أنك لا تملك معلومة مؤكدة.`;

  const ctxLines = [
    `## سياق الجلسة`,
    `اللغة المطلوبة: ${ctx.locale === "ar" ? "العربية" : "English"}`,
    `دور المستخدم: ${ctx.principal.role}`,
    ctx.principal.name ? `اسم المستخدم: ${ctx.principal.name}` : "",
    ctx.pageContext?.path ? `الصفحة الحالية داخل المنتج: ${ctx.pageContext.path}` : "",
    ctx.pageContext?.projectType ? `نوع المشروع الحالي: ${ctx.pageContext.projectType}` : "",
  ].filter(Boolean);

  return {
    platform: interpolate(readPrompt("system.md"), vars),
    organization: orgLayer,
    product: productLayer,
    role: roleLayer,
    safety: interpolate(readPrompt("safety.md"), vars),
    tools: toolsLayer,
    formatting: readPrompt("formatting.md"),
    knowledge: knowledgeLayer,
    context: ctxLines.join("\n"),
  };
}

export function composeSystemPrompt(layers: PromptLayers): string {
  return [layers.platform, layers.organization, layers.product, layers.role, layers.safety, layers.tools, layers.formatting, layers.knowledge, layers.context]
    .filter(Boolean)
    .join("\n\n====\n\n");
}
