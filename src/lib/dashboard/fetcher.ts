"use client";

export class ApiClientError extends Error {
  constructor(public code: string, message: string, public status: number, public details?: unknown) { super(message); }
}

/** Thin client for dashboard → API calls. Same-origin, cookie-authenticated. */
export async function api<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const headers = new Headers(init?.headers);
  let body = init?.body;
  if (init?.json !== undefined) { headers.set("content-type", "application/json"); body = JSON.stringify(init.json); }
  const res = await fetch(path, { ...init, headers, body, credentials: "include" });
  const data = (await res.json().catch(() => ({}))) as { error?: { code: string; message: string; details?: unknown } } & T;
  if (!res.ok) throw new ApiClientError(data.error?.code ?? "error", data.error?.message ?? res.statusText, res.status, data.error?.details);
  return data;
}
