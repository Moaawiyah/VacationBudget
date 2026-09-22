import { afterEach, describe, expect, it, vi } from "vitest";
import { GroqProvider } from "@/lib/ai/provider/groq-provider";
import { AIRateLimited, AIRejected, AITimeout, AIUnavailable } from "@/lib/ai/provider/errors";

afterEach(() => vi.unstubAllGlobals());

function provider() {
  return new GroqProvider("test-key", "test-model", "https://groq.test/openai/v1", 5000);
}

describe("GroqProvider", () => {
  it("rejects an empty API key immediately, before any network call", () => {
    expect(() => new GroqProvider("", "model", "url", 1000)).toThrow(AIRejected);
  });

  it("returns the completion's content and any tool calls", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { role: "assistant", content: "Hi" } }] }),
      }),
    );
    const result = await provider().chat([{ role: "user", content: "hello" }]);
    expect(result).toEqual({ content: "Hi", toolCalls: [] });
  });

  it("translates a tool_calls response into ToolCall[]", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  { id: "call_1", type: "function", function: { name: "getBudgetStatus", arguments: '{"tripId":"t1"}' } },
                ],
              },
            },
          ],
        }),
      }),
    );
    const result = await provider().chat([{ role: "user", content: "how are we doing?" }]);
    expect(result).toEqual({
      content: null,
      toolCalls: [{ id: "call_1", name: "getBudgetStatus", arguments: '{"tripId":"t1"}' }],
    });
  });

  it("maps a 429 to AIRateLimited with the retry-after hint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ "retry-after": "2" }),
        json: async () => ({ error: { code: "rate_limit_exceeded", message: "slow down" } }),
      }),
    );
    const error = await provider()
      .chat([{ role: "user", content: "hi" }])
      .catch((e) => e);
    expect(error).toBeInstanceOf(AIRateLimited);
    expect(error.retryAfter).toBe(2);
  });

  it("maps a 500 to AIUnavailable (retryable) and a 400 to AIRejected (not)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({ error: { message: "boom" } }),
      }),
    );
    const serverError = await provider()
      .chat([{ role: "user", content: "hi" }])
      .catch((e) => e);
    expect(serverError).toBeInstanceOf(AIUnavailable);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        headers: new Headers(),
        json: async () => ({ error: { code: "invalid_request", message: "bad" } }),
      }),
    );
    const clientError = await provider()
      .chat([{ role: "user", content: "hi" }])
      .catch((e) => e);
    expect(clientError).toBeInstanceOf(AIRejected);
  });

  it("maps an abort/timeout to AITimeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => {
        const err = new Error("aborted");
        err.name = "AbortError";
        return Promise.reject(err);
      }),
    );
    const error = await provider()
      .chat([{ role: "user", content: "hi" }])
      .catch((e) => e);
    expect(error).toBeInstanceOf(AITimeout);
  });

  it("never sends a service-role key or other app secrets in the request body", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { role: "assistant", content: "ok" } }] }),
    });
    vi.stubGlobal("fetch", fetchSpy);
    await provider().chat([{ role: "user", content: "hi" }]);
    const [, init] = fetchSpy.mock.calls[0];
    const body = JSON.parse((init as RequestInit).body as string);
    expect(JSON.stringify(body)).not.toContain("service_role");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer test-key" });
  });
});
