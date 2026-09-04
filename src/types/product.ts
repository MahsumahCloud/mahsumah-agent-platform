import type { Role } from "./auth";

export type Locale = "ar" | "en";

export interface PricingPlan {
  id: string;
  name: string;
  nameEn?: string;
  price: number;
  currency: "SAR" | "USD";
  billingCycle: "monthly" | "yearly" | "one-time";
  description: string;
  features: string[];
  /** Free-form hints used by suggest_plan (e.g. maxProjects, bandwidthGb, seats). */
  limits?: Record<string, number | string | boolean>;
  recommendedFor?: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  tags?: string[];
}

export interface PolicyItem {
  id: string;
  title: string;
  content: string;
}

export interface AgentPersona {
  /** Display name shown in the widget, e.g. "مساعد محسومة كلاود". */
  name: string;
  role: string;
  tone: string;
  greeting: string;
  greetingEn?: string;
  /** Things the agent is allowed to help with. */
  canHelpWith: string[];
  /** Hard constraints the agent must never violate for this product. */
  cannot: string[];
  defaultLocale: Locale;
}

export interface WidgetTheme {
  primaryColor: string;
  accentColor?: string;
  logoUrl?: string;
  position?: "bottom-right" | "bottom-left";
  title?: string;
}

/**
 * "product": a customer-facing product with its own agent.
 * "organization": the single company-level profile (Mahsuma). Its knowledge and prompt are
 * inherited by every product agent so all agents know the whole product family.
 */
export type ProfileKind = "product" | "organization";

/** Who may talk to the agent without a signed identity. */
export interface AccessPolicy {
  /** Allow unauthenticated visitors (public website) as role "visitor". */
  allowAnonymous: boolean;
  /** Browser origins allowed to call the agent anonymously. Empty = any origin (development only). */
  allowedOrigins: string[];
  /** Requests per minute per anonymous visitor. */
  anonymousRateLimit: number;
}

export interface ProductProfile {
  id: string;
  kind?: ProfileKind;
  access?: AccessPolicy;
  name: string;
  nameEn?: string;
  description: string;
  audience: string;
  website?: string;
  persona: AgentPersona;
  /** Product-specific prompt fragment appended to the platform prompt. */
  productPrompt: string;
  plans: PricingPlan[];
  faqs: FaqItem[];
  policies: PolicyItem[];
  /** Tool ids enabled for this product (subset of the registry). */
  enabledTools: string[];
  /** Which roles may talk to the agent for this product. */
  allowedRoles: Role[];
  /** Answers below this confidence are flagged for review and trigger handoff suggestions. */
  confidenceThreshold: number;
  theme: WidgetTheme;
  status: "active" | "disabled";
}

/** Persisted shape: profile fields that live in DB columns vs. JSON blob. */
export type ProductProfileInput = Omit<ProductProfile, "status"> & { status?: ProductProfile["status"] };
