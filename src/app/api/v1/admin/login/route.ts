import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_COOKIE, createAdminToken, verifyAdminPassword } from "@/lib/auth/admin-session";
import { fail, handleError } from "@/lib/api/responses";

export async function POST(req: NextRequest) {
  try {
    const { password } = z.object({ password: z.string() }).parse(await req.json());
    if (!verifyAdminPassword(password)) return fail("invalid_credentials", "كلمة المرور غير صحيحة", 401);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, createAdminToken(), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
    return res;
  } catch (err) { return handleError(err); }
}
