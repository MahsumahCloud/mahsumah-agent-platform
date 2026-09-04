import { NextRequest, NextResponse } from "next/server";
import { getOrganization, getProduct } from "@/lib/products/repository";
import { assetUrl } from "@/lib/branding";

const CORS = { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=60" };

/** Public, non-sensitive widget bootstrap: persona name, greeting, theme. */
export function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("productId") ?? "";
  const p = getProduct(id);
  if (!p || p.kind === "organization" || p.status !== "active") return NextResponse.json({ error: { code: "product_not_found", message: "Unknown product" } }, { status: 404, headers: CORS });
  const logoUrl = assetUrl(p.theme.logoUrl ?? getOrganization()?.theme.logoUrl);
  const absoluteLogo = logoUrl && logoUrl.startsWith("/") ? `${req.nextUrl.origin}${logoUrl}` : logoUrl;
  return NextResponse.json({ productId: p.id, name: p.persona.name, greeting: p.persona.greeting, greetingEn: p.persona.greetingEn ?? p.persona.greeting, theme: { ...p.theme, logoUrl: absoluteLogo }, defaultLocale: p.persona.defaultLocale }, { headers: CORS });
}
