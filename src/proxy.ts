import { NextRequest, NextResponse } from "next/server";

/**
 * Route protection for the dashboard. Token verification (HMAC) happens in the pages/APIs
 * via lib/auth/admin-session; here we only redirect unauthenticated users to /login.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = pathname.startsWith("/login") || pathname.startsWith("/api/") || pathname === "/widget.js" || pathname.startsWith("/_next") || pathname.startsWith("/demo");
  if (isPublic) return NextResponse.next();
  const hasCookie = Boolean(req.cookies.get("agent_admin_session")?.value);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
