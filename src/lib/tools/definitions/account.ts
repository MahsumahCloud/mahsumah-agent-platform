import { z } from "zod";
import { registerTool } from "../registry";

export const getCurrentUser = registerTool({
  id: "get_current_user",
  description: "Returns the identity, role and tenant of the user currently talking to the agent. Use it before answering questions about 'my account'.",
  category: "account",
  requiredPermissions: ["read:own_account"],
  requiresAccountContext: true,
  sideEffect: false,
  inputSchema: z.object({}),
  outputSchema: z.object({ userId: z.string(), tenantId: z.string(), role: z.string(), name: z.string().optional(), email: z.string().optional(), locale: z.string().optional() }),
  async execute(_input, ctx) {
    // MVP: identity comes from the authenticated request. Production: enrich from the host product's user API.
    const { userId, tenantId, role, name, email, locale } = ctx.principal;
    return { userId, tenantId, role, name, email, locale };
  },
});

export const fetchBillingSummary = registerTool({
  id: "fetch_billing_summary",
  description: "Returns the current plan, next invoice and outstanding balance for the user's tenant. Only for the user's own tenant.",
  category: "billing",
  requiredPermissions: ["read:own_billing"],
  requiresAccountContext: true,
  sideEffect: false,
  inputSchema: z.object({}),
  outputSchema: z.object({ tenantId: z.string(), currentPlan: z.string(), currency: z.string(), nextInvoiceAmount: z.number(), nextInvoiceDate: z.string(), outstandingBalance: z.number(), status: z.enum(["active", "past_due", "trial"]) }),
  async execute(_input, ctx) {
    // MOCK — replace with a call to the billing service, always scoped to ctx.principal.tenantId.
    const plan = ctx.product.plans[1] ?? ctx.product.plans[0];
    return { tenantId: ctx.principal.tenantId, currentPlan: plan?.name ?? "—", currency: plan?.currency ?? "SAR", nextInvoiceAmount: plan?.price ?? 0, nextInvoiceDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10), outstandingBalance: 0, status: "active" as const };
  },
});

export const checkProjectStatus = registerTool({
  id: "check_project_status",
  description: "Returns deployment/project status for the user's tenant (last deployment, state, region). Use for 'why is my deploy failing' or 'what is the status of my project'.",
  category: "account",
  requiredPermissions: ["read:own_projects"],
  requiresAccountContext: true,
  sideEffect: false,
  inputSchema: z.object({ projectId: z.string().optional().describe("Specific project id; omit for all projects") }),
  outputSchema: z.object({ tenantId: z.string(), projects: z.array(z.object({ id: z.string(), name: z.string(), framework: z.string(), status: z.enum(["ready", "building", "failed", "queued"]), region: z.string(), lastDeployAt: z.string(), lastError: z.string().optional() })) }),
  async execute(input, ctx) {
    // MOCK — replace with the product's projects API scoped to tenantId.
    const framework = typeof ctx.pageContext?.projectType === "string" ? ctx.pageContext.projectType : "nextjs";
    const projects = [
      { id: "prj_demo_1", name: "website", framework, status: "ready" as const, region: "riyadh-1", lastDeployAt: new Date(Date.now() - 3600000).toISOString() },
      { id: "prj_demo_2", name: "api", framework: "nodejs", status: "failed" as const, region: "riyadh-1", lastDeployAt: new Date(Date.now() - 7200000).toISOString(), lastError: "Build failed: missing environment variable DATABASE_URL" },
    ];
    return { tenantId: ctx.principal.tenantId, projects: input.projectId ? projects.filter((p) => p.id === input.projectId) : projects };
  },
});
