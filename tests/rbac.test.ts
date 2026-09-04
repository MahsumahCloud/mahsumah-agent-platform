import { test } from "node:test";
import assert from "node:assert/strict";
import { hasAllPermissions, hasPermission, isRole } from "../src/lib/auth/rbac";

test("roles map to permissions", () => {
  assert.ok(hasPermission("customer_admin", "read:own_billing"));
  assert.ok(!hasPermission("developer", "read:own_billing"));
  assert.ok(!hasPermission("visitor", "write:support_ticket"));
  assert.ok(hasAllPermissions("owner", ["admin:products", "admin:knowledge"]));
});

test("unknown roles are rejected", () => {
  assert.ok(isRole("developer"));
  assert.ok(!isRole("superuser"));
});
