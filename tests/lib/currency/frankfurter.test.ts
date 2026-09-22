import { afterEach, describe, expect, it, vi } from "vitest";
import { frankfurterProvider } from "@/lib/currency/providers/frankfurter";

afterEach(() => vi.unstubAllGlobals());

function stubFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({}), ...response }),
  );
}

describe("frankfurterProvider", () => {
  it("resolves a rate and the date it's quoted for", async () => {
    stubFetch({ json: async () => ({ date: "2026-06-01", rates: { EUR: 0.92 } }) });
    expect(await frankfurterProvider.fetchRate("USD", "EUR")).toEqual({
      rate: 0.92,
      source: "frankfurter",
      rateDate: "2026-06-01",
    });
  });

  it("returns null on a non-200 response rather than throwing", async () => {
    stubFetch({ ok: false });
    expect(await frankfurterProvider.fetchRate("USD", "EUR")).toBeNull();
  });

  it("returns null when the target currency is missing from the response", async () => {
    stubFetch({ json: async () => ({ date: "2026-06-01", rates: {} }) });
    expect(await frankfurterProvider.fetchRate("USD", "EUR")).toBeNull();
  });

  it("returns null on a network failure rather than throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    expect(await frankfurterProvider.fetchRate("USD", "EUR")).toBeNull();
  });

  it("returns null on malformed JSON rather than throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("bad json");
        },
      }),
    );
    expect(await frankfurterProvider.fetchRate("USD", "EUR")).toBeNull();
  });
});
