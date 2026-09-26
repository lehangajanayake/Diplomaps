/** A simple sliding-window limit per IP. In-memory: per process in dev, per instance on Vercel. */
const WINDOW_MS = 60_000;
const hits = new Map<string, number[]>();

export function rateLimit(ip: string, limit = Number(process.env.RATE_LIMIT_PER_MINUTE ?? 60)): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return { ok: false, retryAfter: Math.ceil((WINDOW_MS - (now - recent[0]!)) / 1000) };
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 10_000) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
  }
  return { ok: true, retryAfter: 0 };
}
