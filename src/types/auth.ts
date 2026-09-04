/**
 * Roles are shared across all products. Each role maps to a set of permissions
 * (see lib/auth/rbac.ts). Products can further restrict which roles may chat.
 */
export const ROLES = [
  "visitor",
  "customer",
  "customer_admin",
  "developer",
  "support_agent",
  "owner",
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "chat",
  "read:own_account",
  "read:own_billing",
  "read:own_projects",
  "read:tenant_users",
  "write:support_ticket",
  "write:onboarding",
  "admin:products",
  "admin:knowledge",
  "admin:conversations",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export interface Principal {
  userId: string;
  tenantId: string;
  role: Role;
  /** Optional display info passed by the host product. */
  name?: string;
  email?: string;
  locale?: "ar" | "en";
}
