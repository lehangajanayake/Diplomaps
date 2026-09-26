/** Small helpers shared by the handlers: JSON in and out, client IP, method and rate-limit guard. */
import { rateLimit } from './rateLimit.js';

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
  });
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') ?? 'local';
}

/** Rejects anything that is not a rate-limited POST. Returns a Response to send, or null to continue. */
export function guard(req: Request): Response | null {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
  const limit = rateLimit(clientIp(req));
  if (!limit.ok) return json({ error: 'rate_limited', retryAfter: limit.retryAfter }, 429, { 'Retry-After': String(limit.retryAfter) });
  return null;
}

export async function readJson(req: Request, maxBytes = 96_000): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return { ok: false };
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}
