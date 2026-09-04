import { z } from "zod";
import { ROLES } from "@/types";

const localeSchema = z.enum(["ar", "en"]);

export const pricingPlanSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  price: z.number().nonnegative(),
  currency: z.enum(["SAR", "USD"]),
  billingCycle: z.enum(["monthly", "yearly", "one-time"]),
  description: z.string(),
  features: z.array(z.string()),
  limits: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
  recommendedFor: z.array(z.string()).optional(),
});

export const faqSchema = z.object({ id: z.string().min(1), question: z.string().min(1), answer: z.string().min(1), tags: z.array(z.string()).optional() });
export const policySchema = z.object({ id: z.string().min(1), title: z.string().min(1), content: z.string().min(1) });

export const personaSchema = z.object({
  name: z.string().min(1),
  role: z.string().min(1),
  tone: z.string().min(1),
  greeting: z.string().min(1),
  greetingEn: z.string().optional(),
  canHelpWith: z.array(z.string()),
  cannot: z.array(z.string()),
  defaultLocale: localeSchema,
});

export const themeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logoUrl: z.string().optional(),
  position: z.enum(["bottom-right", "bottom-left"]).optional(),
  title: z.string().optional(),
});

export const productProfileSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,48}$/, "id must be lowercase letters, digits and dashes"),
  kind: z.enum(["product", "organization"]).optional(),
  access: z.object({ allowAnonymous: z.boolean(), allowedOrigins: z.array(z.string()), anonymousRateLimit: z.number().int().min(1).max(600) }).optional(),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  description: z.string().min(1),
  audience: z.string().min(1),
  website: z.string().optional(),
  persona: personaSchema,
  productPrompt: z.string(),
  plans: z.array(pricingPlanSchema),
  faqs: z.array(faqSchema),
  policies: z.array(policySchema),
  enabledTools: z.array(z.string()),
  allowedRoles: z.array(z.enum(ROLES)),
  confidenceThreshold: z.number().min(0).max(1),
  theme: themeSchema,
  status: z.enum(["active", "disabled"]),
});

export type ProductProfileParsed = z.infer<typeof productProfileSchema>;
