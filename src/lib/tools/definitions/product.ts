import { z } from "zod";
import { registerTool } from "../registry";
import { retrieve } from "@/lib/rag/retriever";

export const getProductInfo = registerTool({
  id: "get_product_info",
  description: "Returns the current product's name, description, audience and what the assistant can help with.",
  category: "product",
  requiredPermissions: [],
  requiresAccountContext: false,
  sideEffect: false,
  inputSchema: z.object({}),
  outputSchema: z.object({ id: z.string(), name: z.string(), description: z.string(), audience: z.string(), website: z.string().optional(), canHelpWith: z.array(z.string()) }),
  async execute(_input, ctx) {
    const p = ctx.product;
    return { id: p.id, name: p.name, description: p.description, audience: p.audience, website: p.website, canHelpWith: p.persona.canHelpWith };
  },
});

const planOut = z.object({ id: z.string(), name: z.string(), price: z.number(), currency: z.string(), billingCycle: z.string(), description: z.string(), features: z.array(z.string()), limits: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional() });

export const getPricingPlans = registerTool({
  id: "get_pricing_plans",
  description: "Returns the official pricing plans for this product. Always use this instead of guessing prices.",
  category: "product",
  requiredPermissions: [],
  requiresAccountContext: false,
  sideEffect: false,
  inputSchema: z.object({}),
  outputSchema: z.object({ plans: z.array(planOut) }),
  async execute(_input, ctx) {
    return { plans: ctx.product.plans.map((p) => ({ id: p.id, name: p.name, price: p.price, currency: p.currency, billingCycle: p.billingCycle, description: p.description, features: p.features, limits: p.limits })) };
  },
});

export const suggestPlan = registerTool({
  id: "suggest_plan",
  description: "Recommends the most suitable pricing plan given the customer's stated needs (traffic, team size, projects, compliance). Returns a ranked list with reasons. Only recommends plans that exist.",
  category: "product",
  requiredPermissions: [],
  requiresAccountContext: false,
  sideEffect: false,
  inputSchema: z.object({ needs: z.string().describe("Customer's needs in their own words"), expectedProjects: z.number().int().optional(), teamSize: z.number().int().optional(), monthlyVisits: z.number().int().optional() }),
  outputSchema: z.object({ recommendations: z.array(z.object({ planId: z.string(), planName: z.string(), price: z.number(), currency: z.string(), score: z.number(), reasons: z.array(z.string()) })) }),
  async execute(input, ctx) {
    const text = input.needs.toLowerCase();
    const wantsEnterprise = /enterprise|مؤسس|حكوم|compliance|امتثال|sla|dedicated|مخصص|كبير/.test(text);
    const wantsStarter = /صغير|تجرب|بداية|hobby|personal|شخصي|start|طالب|مجاني|free/.test(text);
    const scored = ctx.product.plans.map((p) => {
      let score = 0.5;
      const reasons: string[] = [];
      const limits = p.limits ?? {};
      const maxProjects = typeof limits.maxProjects === "number" ? limits.maxProjects : undefined;
      const seats = typeof limits.seats === "number" ? limits.seats : undefined;
      if (input.expectedProjects !== undefined && maxProjects !== undefined) {
        if (maxProjects >= input.expectedProjects) { score += 0.2; reasons.push(`يغطي ${input.expectedProjects} مشروع (الحد ${maxProjects})`); } else { score -= 0.4; reasons.push(`الحد ${maxProjects} مشروع أقل من احتياجك`); }
      }
      if (input.teamSize !== undefined && seats !== undefined) {
        if (seats >= input.teamSize) { score += 0.15; } else { score -= 0.3; reasons.push(`عدد المقاعد ${seats} أقل من فريقك`); }
      }
      const tier = p.recommendedFor?.join(" ").toLowerCase() ?? "";
      if (wantsEnterprise && /enterprise|مؤسس/.test(tier)) { score += 0.3; reasons.push("مناسب للمؤسسات ومتطلبات الامتثال"); }
      if (wantsStarter && /starter|بداية|فرد|أفراد/.test(tier)) { score += 0.3; reasons.push("مناسب للبداية والمشاريع الصغيرة"); }
      if (!wantsEnterprise && !wantsStarter && /growth|نمو|شركات ناشئة|startup/.test(tier)) { score += 0.15; reasons.push("الخيار المتوازن لأغلب الفرق"); }
      if (reasons.length === 0) reasons.push(p.description);
      return { planId: p.id, planName: p.name, price: p.price, currency: p.currency, score: Number(Math.max(0, Math.min(1, score)).toFixed(2)), reasons };
    });
    scored.sort((a, b) => b.score - a.score);
    return { recommendations: scored.slice(0, 3) };
  },
});

export const searchKnowledgeBase = registerTool({
  id: "search_knowledge_base",
  description: "Semantic search over this product's documentation, FAQs and policies. Use when the initial context is insufficient or the user asks a follow-up on a different topic.",
  category: "knowledge",
  requiredPermissions: [],
  requiresAccountContext: false,
  sideEffect: false,
  inputSchema: z.object({ query: z.string().min(2), topK: z.number().int().min(1).max(10).optional() }),
  outputSchema: z.object({ results: z.array(z.object({ sourceId: z.string(), chunkId: z.string(), title: z.string(), excerpt: z.string(), score: z.number() })) }),
  async execute(input, ctx) {
    const chunks = await retrieve(ctx.product.id, input.query, { topK: input.topK ?? 5 });
    return { results: chunks.map((c) => ({ sourceId: c.sourceId, chunkId: c.id, title: c.heading ? `${c.sourceTitle} › ${c.heading}` : c.sourceTitle, excerpt: c.content.slice(0, 600), score: c.score })) };
  },
});

export const explainDeploymentSteps = registerTool({
  id: "explain_deployment_steps",
  description: "Returns the official step-by-step deployment guide for a given framework from the product docs. Use for developers asking how to deploy.",
  category: "knowledge",
  requiredPermissions: [],
  requiresAccountContext: false,
  sideEffect: false,
  inputSchema: z.object({ framework: z.string().describe("e.g. nextjs, nodejs, static, docker") }),
  outputSchema: z.object({ framework: z.string(), steps: z.array(z.string()), sourceTitle: z.string().optional() }),
  async execute(input, ctx) {
    const chunks = await retrieve(ctx.product.id, `خطوات نشر ${input.framework} deploy ${input.framework} steps`, { topK: 3 });
    const best = chunks[0];
    const steps = best ? best.content.split("\n").filter((l) => /^\s*(\d+[.)]|-|\*)\s+/.test(l)).map((l) => l.replace(/^\s*(\d+[.)]|-|\*)\s+/, "").trim()) : [];
    return { framework: input.framework, steps: steps.length ? steps : ["لم أجد دليل نشر موثق لهذا الإطار في قاعدة المعرفة. يمكنك فتح تذكرة ليساعدك فريق الدعم."], sourceTitle: best?.sourceTitle };
  },
});
