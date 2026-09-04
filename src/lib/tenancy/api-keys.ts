import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb, schema } from "@/db/client";

export interface ApiKeyRecord {
  id: string;
  productId: string;
  label: string;
  keyPrefix: string;
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}

export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/** Keys look like `mak_<productId>_<random>` so support can tell which product a key belongs to. */
export function createApiKey(productId: string, label: string): { raw: string; record: ApiKeyRecord } {
  const raw = `mak_${productId.replace(/[^a-z0-9]/gi, "").slice(0, 12)}_${randomBytes(24).toString("base64url")}`;
  const now = new Date().toISOString();
  const record: ApiKeyRecord = { id: nanoid(), productId, label, keyPrefix: raw.slice(0, 16), createdAt: now, revokedAt: null, lastUsedAt: null };
  getDb().insert(schema.apiKeys).values({ ...record, keyHash: hashKey(raw) }).run();
  return { raw, record };
}

export function listApiKeys(productId: string): ApiKeyRecord[] {
  return getDb()
    .select({ id: schema.apiKeys.id, productId: schema.apiKeys.productId, label: schema.apiKeys.label, keyPrefix: schema.apiKeys.keyPrefix, createdAt: schema.apiKeys.createdAt, revokedAt: schema.apiKeys.revokedAt, lastUsedAt: schema.apiKeys.lastUsedAt })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.productId, productId))
    .all();
}

export function revokeApiKey(id: string): void {
  getDb().update(schema.apiKeys).set({ revokedAt: new Date().toISOString() }).where(eq(schema.apiKeys.id, id)).run();
}

/** Resolves a raw key to its product. Returns undefined for unknown or revoked keys. */
export function resolveApiKey(raw: string): { productId: string; keyId: string } | undefined {
  const db = getDb();
  const row = db
    .select({ id: schema.apiKeys.id, productId: schema.apiKeys.productId })
    .from(schema.apiKeys)
    .where(and(eq(schema.apiKeys.keyHash, hashKey(raw)), isNull(schema.apiKeys.revokedAt)))
    .get();
  if (!row) return undefined;
  db.update(schema.apiKeys).set({ lastUsedAt: new Date().toISOString() }).where(eq(schema.apiKeys.id, row.id)).run();
  return { productId: row.productId, keyId: row.id };
}
