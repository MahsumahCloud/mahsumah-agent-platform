import type { NextRequest } from "next/server";
import { resolveApiKey } from "@/lib/tenancy/api-keys";
import { isUserToken, verifyUserToken, type UserTokenPayload } from "@/lib/tenancy/user-token";
import { isAdminRequest } from "@/lib/auth/admin-session";
import { TenancyError } from "@/lib/tenancy/context";
import type { ProductProfile } from "@/types";

export function originAllowed(origin: string | null, allowlist: string[]): boolean {
  if (allowlist.length === 0) return true; // development convenience; production profiles should list their domains
  if (!origin) return false;
  return allowlist.some((o) => o.trim().replace(/\/$/, "").toLowerCase() === origin.toLowerCase());
}

export type AgentAuth =
  | { kind: "api_key"; keyId: string }
  | { kind: "user_token"; keyId: string; identity: UserTokenPayload }
  | { kind: "admin" }
  | { kind: "anonymous"; origin: string | null };

/**
 * Public agent endpoint authentication.
 *  - `Authorization: Bearer mak_…`  product API key — server-to-server only; the body's
 *    tenantId/userId/role are trusted because the caller is the host backend.
 *  - `Authorization: Bearer mat_…`  signed user token minted by the host backend — safe for
 *    browsers; identity comes from the token, the body cannot override it.
 *  - Admin cookie — dashboard playground.
 */
export async function authenticateAgentRequest(req: NextRequest, product: ProductProfile): Promise<AgentAuth> {
  const productId = product.id;
  const header = req.headers.get("authorization");
  const raw = header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : req.headers.get("x-api-key")?.trim();
  if (raw) {
    if (isUserToken(raw)) {
      const { payload, keyId } = verifyUserToken(raw, productId);
      return { kind: "user_token", keyId, identity: payload };
    }
    const resolved = resolveApiKey(raw);
    if (!resolved) throw new TenancyError("Invalid or revoked API key", 401);
    if (resolved.productId !== productId) throw new TenancyError("API key does not belong to this product", 403);
    return { kind: "api_key", keyId: resolved.keyId };
  }
  if (await isAdminRequest()) return { kind: "admin" };
  // Public visitor mode: only when the product allows it and the browser origin is on the allowlist.
  const access = product.access;
  if (access?.allowAnonymous) {
    const origin = req.headers.get("origin");
    if (!originAllowed(origin, access.allowedOrigins)) throw new TenancyError("Origin not allowed for anonymous access", 403);
    return { kind: "anonymous", origin };
  }
  throw new TenancyError("Missing credentials", 401);
}

/** Dashboard/admin endpoints use the signed admin cookie. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminRequest())) throw new TenancyError("Admin authentication required", 401);
}
