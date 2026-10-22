import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiting for our own API routes (favorites writes). One interface,
 * two honest backends:
 *
 * - Upstash Redis when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   are set: a shared sliding window across every serverless instance.
 *   Dormant by default — activating it is purely an env-var change, no
 *   deploy config.
 * - In-memory fixed window otherwise: per Node process — honestly
 *   labelled, it protects a single dev/preview instance. Auth endpoints
 *   are rate-limited by Better Auth itself (built-in rate-limit config).
 *
 * The Upstash path fails open: a limiter outage must not take the API
 * down, so errors are logged and treated as "allowed" this once.
 */

const state = new Map<string, { count: number; windowStartedAt: number }>();

const DEFAULT_LIMIT = 30;
const DEFAULT_WINDOW_MS = 60_000;

/** One limiter per (limit, window) pair — upstash clients are reusable. */
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(limit: number, windowMs: number): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const cacheKey = `${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    const redis = new Redis({ url, token });
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      prefix: "movie-lake:rl",
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets (for a Retry-After header). */
  retryAfterSec: number;
}

export async function rateLimit(
  key: string,
  {
    limit = DEFAULT_LIMIT,
    windowMs = DEFAULT_WINDOW_MS,
  }: { limit?: number; windowMs?: number } = {},
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(limit, windowMs);
  if (upstash) {
    try {
      const { success, reset } = await upstash.limit(key);
      if (success) return { ok: true, retryAfterSec: 0 };
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
      };
    } catch (error) {
      console.error(
        "[rate-limit] Upstash call failed, failing open:",
        error instanceof Error ? error.message : error,
      );
      return { ok: true, retryAfterSec: 0 };
    }
  }

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
