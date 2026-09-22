import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchExchangeRate } from "@/lib/currency/exchange-rate";

afterEach(() => vi.unstubAllGlobals());

describe("fetchExchangeRate", () => {
  it("resolves the same-currency case to exactly 1, with no network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const lookup = await fetchExchangeRate("EUR", "EUR");
    expect(lookup).toMatchObject({ rate: 1, source: "manual" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("delegates a cross-currency lookup to the configured provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ date: "2026-06-01", rates: { EUR: 0.92 } }),
      }),
    );
    const lookup = await fetchExchangeRate("USD", "EUR");
    expect(lookup).toEqual({ rate: 0.92, source: "frankfurter", rateDate: "2026-06-01" });
  });

  it("falls back to null (never throws) when the provider can't answer", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await fetchExchangeRate("USD", "EUR")).toBeNull();
  });
});
