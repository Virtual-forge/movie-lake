import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Pins the in-memory fallback contract (no Upstash env vars in test
 * runs). Distinct keys per test — module state persists across a worker,
 * so tests must not share windows.
 */
describe("rateLimit (in-memory fallback)", () => {
  it("allows up to the burst then rejects until the window resets", async () => {
    const stamp = Math.random().toString(36).slice(2);
    const key = `test:burst:${stamp}`;

    for (let i = 0; i < 30; i += 1) {
      const result = await rateLimit(key, { limit: 30 });
      expect(result.ok).toBe(true);
      expect(result.retryAfterSec).toBe(0);
    }

    const barred = await rateLimit(key, { limit: 30 });
    expect(barred.ok).toBe(false);
    expect(barred.retryAfterSec).toBeGreaterThanOrEqual(1);
    expect(barred.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("restarts cleanly once the window elapses", async () => {
    const stamp = Math.random().toString(36).slice(2);
    const key = `test:window:${stamp}`;

    const first = await rateLimit(key, {
      limit: 2,
      windowMs: 1500,
    });
    expect(first.ok).toBe(true);

    const allowed = await rateLimit(key, { limit: 2, windowMs: 1500 });
    expect(allowed.ok).toBe(true);

    const barred = await rateLimit(key, { limit: 2, windowMs: 1500 });
    expect(barred.ok).toBe(false);

    // Current window started moments ago, so Retry-After reflects the
    // remainder, not the full window.
    expect(barred.retryAfterSec).toBeLessThanOrEqual(2);

    await new Promise((resolve) => setTimeout(resolve, 1600));
    const reopened = await rateLimit(key, { limit: 2, windowMs: 1500 });
    expect(reopened.ok).toBe(true);
  });
});
