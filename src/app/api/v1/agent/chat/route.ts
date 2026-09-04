import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { runAgent } from "@/lib/agent";
import { authenticateAgentRequest } from "@/lib/api/auth";
import { fail, handleError, ok } from "@/lib/api/responses";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getProduct } from "@/lib/products/repository";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

const bodySchema = z.object({
  productId: z.string().min(1),
  tenantId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  message: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
  locale: z.enum(["ar", "en"]).optional(),
  pageContext: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const CORS: Record<string, string> = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key" };

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = bodySchema.parse(await req.json());
    const product = getProduct(body.productId);
    if (!product || product.kind === "organization") return fail("product_not_found", "Product not found", 404);
    const auth = await authenticateAgentRequest(req, product);

    // Identity resolution: a user token is authoritative; an API key trusts the host backend's body.
    let identity: { tenantId: string; userId: string; role: string; name?: string; locale?: "ar" | "en" };
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (auth.kind === "user_token") {
      identity = { tenantId: auth.identity.tenantId, userId: auth.identity.userId, role: auth.identity.role, name: auth.identity.name, locale: auth.identity.locale };
    } else if (auth.kind === "anonymous") {
      // Visitors are always role "visitor" in a shared "anonymous" tenant; the id is a stable per-browser
      // token from the widget, hashed with the IP so it cannot be used to read anyone else's history.
      const visitorId = createHash("sha256").update(`${body.userId ?? "anon"}:${ip}`).digest("hex").slice(0, 24);
      identity = { tenantId: "anonymous", userId: `visitor_${visitorId}`, role: "visitor" };
    } else {
      if (!body.tenantId || !body.userId || !body.role) return fail("validation_error", "tenantId, userId and role are required with an API key", 400);
      identity = { tenantId: body.tenantId, userId: body.userId, role: body.role };
    }

    // Rate limit on a caller-controlled-proof key: credential id + verified user (token), client IP otherwise.
    const rlKey = auth.kind === "user_token" ? `${auth.keyId}:${identity.tenantId}:${identity.userId}` : auth.kind === "api_key" ? `${auth.keyId}:${ip}` : auth.kind === "anonymous" ? `anon:${product.id}:${ip}` : `admin:${ip}`;
    const rl = checkRateLimit(rlKey, auth.kind === "api_key" ? 300 : auth.kind === "anonymous" ? (product.access?.anonymousRateLimit ?? 15) : 30);
    if (!rl.allowed) return fail("rate_limited", "Too many requests, slow down", 429);

    const result = await runAgent({
      productId: body.productId,
      tenantId: identity.tenantId,
      userId: identity.userId,
      role: identity.role,
      message: body.message,
      conversationId: body.conversationId,
      locale: body.locale ?? identity.locale,
      pageContext: body.pageContext,
      metadata: { ...body.metadata, ...(identity.name ? { userName: identity.name } : {}), authKind: auth.kind },
    });
    const headers = { ...CORS };
    if (auth.kind === "anonymous" && auth.origin && (product.access?.allowedOrigins.length ?? 0) > 0) { headers["Access-Control-Allow-Origin"] = auth.origin; headers.Vary = "Origin"; }
    return ok(result, { headers });
  } catch (err) {
    const res = handleError(err);
    for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
    return res;
  }
}
