/**
 * Lightweight in-memory rate limiter for Next.js route handlers.
 *
 * NOT suitable for horizontally-scaled deployments (each instance keeps its
 * own map). For single-instance or low-traffic endpoints it's a big upgrade
 * over relying only on client-side throttling. Swap for Upstash/Redis if the
 * app grows beyond one server instance.
 *
 * Uses a fixed-window strategy: up to `limit` requests per `windowMs` per key.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

// Periodic cleanup to prevent unbounded growth. Runs at most once per minute.
let lastSweep = 0
function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k)
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  resetAt: number
  retryAfterSec: number
}

export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, remaining: opts.limit - 1, resetAt, retryAfterSec: 0 }
  }

  if (existing.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.ceil((existing.resetAt - now) / 1000),
    }
  }

  existing.count += 1
  return {
    ok: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSec: 0,
  }
}

/**
 * Extract a best-effort client identifier from the request.
 * Prefers standard proxy headers (Vercel sets x-forwarded-for).
 */
export function getClientKey(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0]!.trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}
