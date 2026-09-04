import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db/client";
import type { ProductProfile, ProductProfileInput } from "@/types";
import { productProfileSchema } from "./schema";

export class ProductNotFoundError extends Error {
  constructor(id: string) { super(`Product not found: ${id}`); }
}

/** Reserved id of the organization-level profile whose knowledge every product agent inherits. */
export const ORGANIZATION_ID = "mahsuma-org";

/** Customer-facing products only (the organization profile is excluded). */
export function listProducts(): ProductProfile[] {
  return getDb().select().from(schema.products).all().map((r) => r.profile as ProductProfile).filter((p) => p.kind !== "organization");
}

export function getOrganization(): ProductProfile | undefined {
  const p = getProduct(ORGANIZATION_ID);
  return p?.kind === "organization" ? p : undefined;
}

export function getProduct(id: string): ProductProfile | undefined {
  const row = getDb().select().from(schema.products).where(eq(schema.products.id, id)).get();
  return row ? (row.profile as ProductProfile) : undefined;
}

export function requireProduct(id: string): ProductProfile {
  const p = getProduct(id);
  if (!p) throw new ProductNotFoundError(id);
  return p;
}

export function upsertProduct(input: ProductProfileInput): ProductProfile {
  const profile = productProfileSchema.parse({ status: "active", ...input });
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.select({ id: schema.products.id }).from(schema.products).where(eq(schema.products.id, profile.id)).get();
  if (existing) {
    db.update(schema.products).set({ name: profile.name, status: profile.status, profile, updatedAt: now }).where(eq(schema.products.id, profile.id)).run();
  } else {
    db.insert(schema.products).values({ id: profile.id, name: profile.name, status: profile.status, profile, createdAt: now, updatedAt: now }).run();
  }
  return profile;
}

export function patchProduct(id: string, patch: Partial<ProductProfile>): ProductProfile {
  const current = requireProduct(id);
  return upsertProduct({ ...current, ...patch, id });
}

export function deleteProduct(id: string): void {
  getDb().delete(schema.products).where(eq(schema.products.id, id)).run();
}
