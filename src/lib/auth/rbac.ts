import { PERMISSIONS, ROLES, type Permission, type Role } from "@/types";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  visitor: ["chat"],
  customer: ["chat", "read:own_account", "read:own_projects", "write:support_ticket", "write:onboarding"],
  developer: ["chat", "read:own_account", "read:own_projects", "write:support_ticket", "write:onboarding"],
  customer_admin: ["chat", "read:own_account", "read:own_projects", "read:own_billing", "read:tenant_users", "write:support_ticket", "write:onboarding"],
  support_agent: ["chat", "read:own_account", "read:own_projects", "read:own_billing", "read:tenant_users", "write:support_ticket", "admin:conversations"],
  owner: [...PERMISSIONS],
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function permissionsFor(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAllPermissions(role: Role, required: Permission[]): boolean {
  return required.every((p) => hasPermission(role, p));
}
