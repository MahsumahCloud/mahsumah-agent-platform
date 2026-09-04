/**
 * In-memory sliding window limiter keyed by API key + user. Good enough for a single
 * instance; replace with Redis (same interface) when running multiple replicas.
 */
const buckets = new Map<string, number[]>();

export function checkRateLimit(key: string, limit = 30, windowMs = 60_000): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) { buckets.set(key, hits); return { allowed: false, remaining: 0 }; }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
  return { allowed: true, remaining: limit - hits.length };
}
