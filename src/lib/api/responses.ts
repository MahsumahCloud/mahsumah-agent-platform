import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { TenancyError } from "@/lib/tenancy/context";
import { ProductNotFoundError } from "@/lib/products/repository";

export interface ApiError { error: { code: string; message: string; details?: unknown } }

export function ok<T>(data: T, init?: ResponseInit): NextResponse<T> {
  return NextResponse.json(data, init);
}

export function fail(code: string, message: string, status: number, details?: unknown): NextResponse<ApiError> {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

/** Maps domain errors to HTTP without leaking stack traces. */
export function handleError(err: unknown): NextResponse<ApiError> {
  if (err instanceof ZodError) return fail("validation_error", "Invalid request body", 400, err.issues);
  if (err instanceof TenancyError) return fail("forbidden", err.message, err.status);
  if (err instanceof ProductNotFoundError) return fail("product_not_found", err.message, 404);
  console.error("[api]", err);
  // Surface the underlying message outside production so misconfiguration (e.g. a bad LLM key) is visible.
  const detail = process.env.NODE_ENV === "production" ? undefined : (err instanceof Error ? err.message : String(err));
  return fail("internal_error", "Something went wrong", 500, detail);
}
