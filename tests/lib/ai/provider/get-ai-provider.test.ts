import { afterEach, describe, expect, it, vi } from "vitest";
import { getAIProvider } from "@/lib/ai/provider";
import { RetryingProvider } from "@/lib/ai/provider/retrying-provider";

afterEach(() => vi.unstubAllEnvs());

describe("getAIProvider", () => {
  it("returns null — every AI feature's 'unavailable' branch — when no key is configured", () => {
    vi.stubEnv("GROQ_API_KEY", "");
    expect(getAIProvider()).toBeNull();
  });

  it("builds a retrying provider when a key is configured", () => {
    vi.stubEnv("GROQ_API_KEY", "test-key");
    expect(getAIProvider()).toBeInstanceOf(RetryingProvider);
  });
});
