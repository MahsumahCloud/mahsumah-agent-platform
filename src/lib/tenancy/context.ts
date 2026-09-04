import type { Principal, Role } from "@/types";
import { isRole } from "@/lib/auth/rbac";

export class TenancyError extends Error {
  constructor(message: string, public status: number = 400) { super(message); }
}

/**
 * Builds the principal from what the host product sent. Tenant + user identity is trusted
 * because the request was authenticated with a product-scoped API key (server-to-server).
 * When the widget is used from the browser, the host product should proxy through its own
 * backend or use a widget-scoped key with limited tools (see docs/INTEGRATION.md).
 */
export function buildPrincipal(input: { userId: string; tenantId: string; role: string; name?: string; email?: string; locale?: "ar" | "en" }): Principal {
  if (!input.userId || !input.tenantId) throw new TenancyError("userId and tenantId are required", 400);
  const role: Role = isRole(input.role) ? input.role : "visitor";
  return { userId: input.userId, tenantId: input.tenantId, role, name: input.name, email: input.email, locale: input.locale };
}
