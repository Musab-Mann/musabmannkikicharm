/**
 * In-memory sliding-window rate limiter.
 * ----------------------------------------------------------------
 * LIMITATION (documented, not hidden): on serverless platforms like Vercel,
 * each function instance has its own memory, so this limit is per-instance,
 * not globally shared across every concurrent request in the world. That is
 * why this is explicitly the APPLICATION layer of defense-in-depth, not the
 * only layer — Cloudflare rate limiting (see CLOUDFLARE_PRODUCTION_SETUP.md)
 * is the authoritative, globally-consistent layer in front of it. Even a
 * per-instance limit still meaningfully slows down a single attacker hitting
 * a single warm instance, and combined with the account lockout in
 * lib/admin/db.ts (which IS globally consistent, since it lives in Postgres)
 * admin login is protected even if this in-memory layer is bypassed.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically clear stale entries so this map cannot grow unbounded.
function sweep() {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}
let lastSweep = 0;

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    sweep();
    lastSweep = now;
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterMs: 0 };
}

/** Extracts a best-effort client IP from standard proxy headers (Vercel/Cloudflare set these). */
export function getClientIp(req: Request): string {
  const headers = req.headers;
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
