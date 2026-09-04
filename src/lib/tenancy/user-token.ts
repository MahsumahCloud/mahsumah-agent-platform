import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import { hashKey } from "./api-keys";
import { TenancyError } from "./context";

/**
 * Browser-safe identity: the host product's BACKEND mints a short-lived token that binds
 * productId + tenantId + userId + role, signed with HMAC-SHA256 using the product API key.
 * The browser only ever sees this token, never the API key, and cannot change its identity.
 *
 * Token format: `mat_<base64url(payload json)>.<base64url(hmac)>`
 * Signing secret = sha256(rawApiKey) so the platform can verify with the stored key hash.
 *
 * Host-side helper (copy into your backend; Node example):
 *   signUserToken({ productId, tenantId, userId, role, ttlSeconds: 900 }, process.env.MAHSUMA_AGENT_KEY)
 */
export interface UserTokenPayload {
  productId: string;
  tenantId: string;
  userId: string;
  role: string;
  name?: string;
  locale?: "ar" | "en";
  /** key prefix (first 16 chars of the raw key) so the server can locate the key hash */
  kid: string;
  exp: number;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function signingSecret(rawApiKey: string): string {
  return hashKey(rawApiKey);
}

export function signUserToken(input: Omit<UserTokenPayload, "kid" | "exp"> & { ttlSeconds?: number }, rawApiKey: string): string {
  const { ttlSeconds = 900, ...rest } = input;
  const payload: UserTokenPayload = { ...rest, kid: rawApiKey.slice(0, 16), exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", signingSecret(rawApiKey)).update(body).digest("base64url");
  return `mat_${body}.${sig}`;
}

export function isUserToken(value: string): boolean {
  return value.startsWith("mat_");
}

/** Verifies signature, expiry and product binding. Returns the payload and the key id used. */
export function verifyUserToken(token: string, expectedProductId: string): { payload: UserTokenPayload; keyId: string } {
  const [body, sig] = token.slice(4).split(".");
  if (!body || !sig) throw new TenancyError("Malformed user token", 401);
  let payload: UserTokenPayload;
  try { payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as UserTokenPayload; } catch { throw new TenancyError("Malformed user token", 401); }
  if (!payload.kid || !payload.exp || !payload.productId || !payload.tenantId || !payload.userId || !payload.role) throw new TenancyError("Malformed user token", 401);
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new TenancyError("User token expired", 401);
  if (payload.productId !== expectedProductId) throw new TenancyError("Token does not belong to this product", 403);

  const db = getDb();
  const candidates = db
    .select({ id: schema.apiKeys.id, keyHash: schema.apiKeys.keyHash, productId: schema.apiKeys.productId, revokedAt: schema.apiKeys.revokedAt })
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyPrefix, payload.kid))
    .all();
  const provided = Buffer.from(sig, "base64url");
  for (const k of candidates) {
    if (k.revokedAt || k.productId !== expectedProductId) continue;
    const expected = createHmac("sha256", k.keyHash).update(body).digest();
    if (expected.length === provided.length && timingSafeEqual(expected, provided)) return { payload, keyId: k.id };
  }
  throw new TenancyError("Invalid user token", 401);
}
