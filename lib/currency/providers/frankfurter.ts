import type { ExchangeRateProvider, RateLookup } from "../exchange-rate-provider";

/**
 * frankfurter.dev republishes the ECB's daily reference rates — free, no
 * API key, no rate-limit tier to manage. The only external-provider
 * integration in the app; isolated here so swapping it later means writing
 * a new file like this one and nothing else.
 */
export const frankfurterProvider: ExchangeRateProvider = {
  source: "frankfurter",

  async fetchRate(from: string, to: string): Promise<RateLookup | null> {
    try {
      const response = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${from}&symbols=${to}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) return null;
      const body = (await response.json()) as { date?: string; rates?: Record<string, number> };
      const rate = body.rates?.[to];
      if (!rate || !body.date) return null;
      return { rate, source: "frankfurter", rateDate: body.date };
    } catch {
      return null; // network error, timeout, malformed JSON — caller falls back to manual entry
    }
  },
};
