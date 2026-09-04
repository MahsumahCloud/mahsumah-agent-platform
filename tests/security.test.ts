import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { isPrivateAddress } from "../src/lib/rag/loaders";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-sec-"));
process.env.DATABASE_PATH = path.join(dir, "t.db");

test("private address detection covers v4 ranges and v6", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "172.16.5.5", "172.31.255.1", "192.168.0.1", "169.254.169.254", "0.0.0.0", "::1", "fe80::1", "fd00::1", "::ffff:10.0.0.1"]) assert.ok(isPrivateAddress(ip), ip);
  for (const ip of ["8.8.8.8", "172.32.0.1", "2606:4700::1111"]) assert.ok(!isPrivateAddress(ip), ip);
});

test("user tokens are bound to key, product and expiry", async () => {
  const { seedProducts } = await import("../src/data/products");
  const { upsertProduct } = await import("../src/lib/products/repository");
  const { createApiKey, revokeApiKey } = await import("../src/lib/tenancy/api-keys");
  const { signUserToken, verifyUserToken } = await import("../src/lib/tenancy/user-token");
  for (const p of seedProducts) upsertProduct(p);
  const { raw, record } = createApiKey("mahsuma-cloud", "widget");

  const token = signUserToken({ productId: "mahsuma-cloud", tenantId: "t1", userId: "u1", role: "customer" }, raw);
  const ok = verifyUserToken(token, "mahsuma-cloud");
  assert.equal(ok.payload.userId, "u1");
  assert.equal(ok.keyId, record.id);

  assert.throws(() => verifyUserToken(token, "mahsuma-dcc"), /product/);
  const tampered = token.replace(Buffer.from(JSON.stringify({})).toString("base64url").slice(0, 0), "").replace(/\.[^.]+$/, ".AAAA");
  assert.throws(() => verifyUserToken(tampered, "mahsuma-cloud"), /Invalid|Malformed/);
  const expired = signUserToken({ productId: "mahsuma-cloud", tenantId: "t1", userId: "u1", role: "customer", ttlSeconds: -10 }, raw);
  assert.throws(() => verifyUserToken(expired, "mahsuma-cloud"), /expired/);
  const forged = signUserToken({ productId: "mahsuma-cloud", tenantId: "t1", userId: "u1", role: "owner" }, "mak_mahsumacloud_notTheRealKey00000000");
  assert.throws(() => verifyUserToken(forged, "mahsuma-cloud"), /Invalid/);

  revokeApiKey(record.id);
  assert.throws(() => verifyUserToken(token, "mahsuma-cloud"), /Invalid/);
  fs.rmSync(dir, { recursive: true, force: true });
});
