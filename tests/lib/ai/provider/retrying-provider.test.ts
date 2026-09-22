import { describe, expect, it, vi } from "vitest";
import { RetryingProvider } from "@/lib/ai/provider/retrying-provider";
import { AIRateLimited, AIRejected, AITimeout } from "@/lib/ai/provider/errors";
import type { AIProvider, ChatResult } from "@/lib/ai/provider/types";

function fakeProvider(...outcomes: (ChatResult | Error)[]): AIProvider {
  let call = 0;
  return {
    chat: vi.fn(async () => {
      const outcome = outcomes[call++];
      if (outcome instanceof Error) throw outcome;
      return outcome;
    }),
  };
}

const noSleep = () => Promise.resolve();
const noJitter = () => 0;

describe("RetryingProvider", () => {
  it("returns the first successful attempt without retrying", async () => {
    const inner = fakeProvider({ content: "ok", toolCalls: [] });
    const provider = new RetryingProvider(inner, 3, 10, 100, 5000, noSleep, Date.now, noJitter);
    expect(await provider.chat([])).toEqual({ content: "ok", toolCalls: [] });
    expect(inner.chat).toHaveBeenCalledTimes(1);
  });

  it("retries a retryable failure and succeeds on the next attempt", async () => {
    const inner = fakeProvider(new AITimeout("slow"), { content: "ok", toolCalls: [] });
    const provider = new RetryingProvider(inner, 3, 10, 100, 5000, noSleep, Date.now, noJitter);
    expect(await provider.chat([])).toEqual({ content: "ok", toolCalls: [] });
    expect(inner.chat).toHaveBeenCalledTimes(2);
  });

  it("does not retry a non-retryable rejection — the identical request would get the identical answer", async () => {
    const inner = fakeProvider(new AIRejected("bad key"), { content: "ok", toolCalls: [] });
    const provider = new RetryingProvider(inner, 3, 10, 100, 5000, noSleep, Date.now, noJitter);
    await expect(provider.chat([])).rejects.toBeInstanceOf(AIRejected);
    expect(inner.chat).toHaveBeenCalledTimes(1);
  });

  it("gives up after maxAttempts, throwing the last error", async () => {
    const inner = fakeProvider(new AITimeout("1"), new AITimeout("2"), new AITimeout("3"));
    const provider = new RetryingProvider(inner, 3, 10, 100, 5000, noSleep, Date.now, noJitter);
    await expect(provider.chat([])).rejects.toBeInstanceOf(AITimeout);
    expect(inner.chat).toHaveBeenCalledTimes(3);
  });

  it("respects a rate limiter's retry-after hint instead of its own backoff", async () => {
    const inner = fakeProvider(new AIRateLimited("slow down", 0.02), { content: "ok", toolCalls: [] });
    const sleep = vi.fn(noSleep);
    const provider = new RetryingProvider(inner, 3, 1000, 100, 5000, sleep, Date.now, noJitter);
    await provider.chat([]);
    expect(sleep).toHaveBeenCalledWith(20); // 0.02s -> 20ms
  });

  it("gives up rather than waiting past the overall deadline", async () => {
    const now = 0;
    const clock = () => now;
    const inner = fakeProvider(new AIRateLimited("slow down", 100), { content: "ok", toolCalls: [] });
    const provider = new RetryingProvider(inner, 3, 10, 200_000, 5000, noSleep, clock, noJitter);
    await expect(provider.chat([])).rejects.toBeInstanceOf(AIRateLimited);
    expect(inner.chat).toHaveBeenCalledTimes(1);
  });
});
