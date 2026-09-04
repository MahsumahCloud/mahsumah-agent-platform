import type { AgentContext, ProductProfile, Locale } from "@/types";
import { TenancyError } from "@/lib/tenancy/context";

export interface MetaBlock { confidence: number; handoff: boolean; usedSources: boolean }

/** Extracts and strips the trailing <meta>{...}</meta> block the formatting prompt requests. */
export function extractMeta(text: string): { answer: string; meta: MetaBlock | null } {
  const m = text.match(/<meta>\s*(\{[\s\S]*?\})\s*<\/meta>\s*$/);
  if (!m || !m[1]) return { answer: text.trim(), meta: null };
  let meta: MetaBlock | null = null;
  try {
    const parsed = JSON.parse(m[1]) as Partial<MetaBlock>;
    meta = { confidence: clamp(Number(parsed.confidence ?? 0.5)), handoff: Boolean(parsed.handoff), usedSources: Boolean(parsed.usedSources) };
  } catch { meta = null; }
  return { answer: text.slice(0, m.index).trim(), meta };
}

function clamp(n: number) { return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.5; }

/** Pre-flight checks before spending an LLM call. */
export function assertRequestAllowed(product: ProductProfile, role: string): void {
  if (product.status !== "active") throw new TenancyError("Product agent is disabled", 403);
  if (!product.allowedRoles.includes(role as ProductProfile["allowedRoles"][number])) throw new TenancyError(`Role ${role} is not allowed to use this agent`, 403);
}

export function detectLocale(message: string, fallback: Locale): Locale {
  const arabic = (message.match(/[؀-ۿ]/g) ?? []).length;
  const latin = (message.match(/[a-zA-Z]/g) ?? []).length;
  if (arabic === 0 && latin === 0) return fallback;
  return arabic >= latin ? "ar" : "en";
}

/**
 * Finds another product of the family that the message clearly refers to, using the product
 * directory (Arabic and English names) so the answer can route the user there.
 */
export function mentionsOtherProduct(productId: string, message: string, products: Pick<ProductProfile, "id" | "name" | "nameEn" | "website">[]): Pick<ProductProfile, "id" | "name" | "nameEn" | "website"> | undefined {
  const text = message.toLowerCase();
  for (const p of products) {
    if (p.id === productId) continue;
    const names = [p.name, p.nameEn].filter((n): n is string => Boolean(n)).map((n) => n.toLowerCase());
    if (names.some((n) => text.includes(n))) return p;
  }
  return undefined;
}

/** Strip anything that looks like another user's identifier the model may have echoed. */
export function redactForeignIdentifiers(answer: string, ctx: AgentContext): string {
  // Defensive only: the tools never return other tenants' data, but a model could hallucinate ids.
  return answer.replace(/\b(user|tenant|company)_[A-Za-z0-9]{3,}\b/g, (m) => (m === ctx.principal.userId || m === ctx.principal.tenantId ? m : "[محجوب]"));
}

export const FALLBACK_ANSWERS: Record<Locale, string> = {
  ar: "عذراً، لم أتمكن من توليد إجابة موثوقة الآن. يمكنك إعادة صياغة السؤال أو فتح تذكرة دعم ليتابعها الفريق معك.",
  en: "Sorry, I couldn't produce a reliable answer right now. Please rephrase, or open a support ticket so the team can follow up.",
};

export const REFUSAL_ANSWERS: Record<Locale, string> = {
  ar: "لا أستطيع المساعدة في هذا الطلب. إذا كان يخص حسابك أو المنتج، يمكنك فتح تذكرة دعم ليتابعه الفريق معك.",
  en: "I can't help with this request. If it concerns your account or the product, please open a support ticket so the team can follow up.",
};
