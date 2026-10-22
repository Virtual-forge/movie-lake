import "server-only";

/**
 * Minimal fixed-window rate limiter for our own API routes (favorites
 * writes). In-memory, per Node process — honestly labelled: it protects a
 * single dev/preview instance. The plan's Upstash Ratelimit swap happens at
 * deploy (M5) when a shared store exists. Auth endpoints are rate-limited
 * by Better Auth itself (built-in rate-limit config).
 */

interface WindowState {
  count: number;
  windowStartedAt: number;
}

const state = new Map<string, WindowState>();

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfterSec: number;
}

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;

export function rateLimit(
  key: string,
  {
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
  }: { limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const now = Date.now();
  let windowState = state.get(key);
  if (!windowState || now - windowState.windowStartedAt >= windowMs) {
    windowState = { count: 0, windowStartedAt: now };
    state.set(key, windowState);
  }
  windowState.count += 1;

  // Opportunistic GC so abandoned windows do not accumulate.
  if (state.size > 5000) {
    for (const [cachedKey, cached] of state) {
      if (now - cached.windowStartedAt >= windowMs) state.delete(cachedKey);
    }
  }

  if (windowState.count > limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((windowState.windowStartedAt + windowMs - now) / 1000),
    );
    return { ok: false, retryAfterSec };
  }
  return { ok: true, retryAfterSec: 0 };
}
