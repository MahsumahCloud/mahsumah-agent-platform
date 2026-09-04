import { z } from "zod";
import { nanoid } from "nanoid";
import { registerTool } from "../registry";

export const createSupportTicket = registerTool({
  id: "create_support_ticket",
  description: "Creates a support ticket on behalf of the current user. Use when the question cannot be answered from the knowledge base, when the user explicitly asks, or when an account issue needs a human.",
  category: "support",
  requiredPermissions: ["write:support_ticket"],
  requiresAccountContext: true,
  sideEffect: true,
  inputSchema: z.object({ subject: z.string().min(3).max(120), description: z.string().min(3), priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"), category: z.string().optional() }),
  outputSchema: z.object({ ticketId: z.string(), status: z.string(), subject: z.string(), priority: z.string(), estimatedResponse: z.string() }),
  async execute(input, ctx) {
    // MOCK — replace with the ticketing/CRM integration (Zendesk, Freshdesk, internal). Always attach tenantId/userId.
    const ticketId = `TCK-${ctx.product.id.slice(0, 3).toUpperCase()}-${nanoid(6).toUpperCase()}`;
    const eta = input.priority === "urgent" ? "خلال ساعة" : input.priority === "high" ? "خلال 4 ساعات" : "خلال 24 ساعة عمل";
    return { ticketId, status: "open", subject: input.subject, priority: input.priority, estimatedResponse: eta };
  },
});

export const createOnboardingChecklist = registerTool({
  id: "create_onboarding_checklist",
  description: "Generates a personalised onboarding checklist for a new customer based on their goal and technical level.",
  category: "onboarding",
  requiredPermissions: ["write:onboarding"],
  requiresAccountContext: true,
  sideEffect: false,
  inputSchema: z.object({ goal: z.string().describe("What the customer wants to achieve"), technicalLevel: z.enum(["non-technical", "developer", "team"]).default("developer") }),
  outputSchema: z.object({ checklist: z.array(z.object({ step: z.string(), done: z.boolean(), link: z.string().optional() })) }),
  async execute(input, ctx) {
    const base = ctx.product.id === "mahsumah-dcc"
      ? [
          { step: "إنشاء الهيكل التنظيمي والإدارات", done: false, link: "/settings/org" },
          { step: "دعوة أعضاء الفريق وتحديد الصلاحيات", done: false, link: "/settings/members" },
          { step: "تعريف مؤشرات الأداء الأساسية (KPIs)", done: false, link: "/kpis" },
          { step: "ربط مصادر البيانات الأولى", done: false, link: "/integrations" },
          { step: "إعداد أول لوحة قيادة تنفيذية", done: false, link: "/dashboards/new" },
        ]
      : [
          { step: "ربط حساب GitHub أو GitLab", done: false, link: "/settings/git" },
          { step: "استيراد أول مشروع", done: false, link: "/projects/new" },
          { step: "إضافة متغيرات البيئة", done: false, link: "/projects/env" },
          { step: "تفعيل النطاق المخصص وشهادة SSL", done: false, link: "/domains" },
          { step: "تفعيل التنبيهات ومراقبة الأداء", done: false, link: "/monitoring" },
        ];
    if (input.technicalLevel === "non-technical") base.push({ step: "حجز جلسة تهيئة مع فريق النجاح", done: false, link: "/support/onboarding-call" });
    return { checklist: base };
  },
});
