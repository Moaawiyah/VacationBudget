import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests up to the limit and blocks the next one", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("limit", 3, 60_000)).toMatchObject({ allowed: true });
    }
    const blocked = rateLimit("limit", 3, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it("resets the window after it elapses", () => {
    rateLimit("reset", 1, 30_000);
    expect(rateLimit("reset", 1, 30_000).allowed).toBe(false);
    vi.advanceTimersByTime(31_000);
    expect(rateLimit("reset", 1, 30_000).allowed).toBe(true);
  });

  it("counts keys independently", () => {
    expect(rateLimit("a", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("b", 1, 60_000).allowed).toBe(true);
    expect(rateLimit("a", 1, 60_000).allowed).toBe(false);
  });

  it("reports the remaining wait as the window slides by whole windows", () => {
    rateLimit("slide", 1, 60_000);
    vi.advanceTimersByTime(15_000);
    const blocked = rateLimit("slide", 1, 60_000);
    expect(blocked.retryAfterSeconds).toBe(45);
  });
});
