import { todayIso, type RateLookup } from "./exchange-rate-provider";
import { frankfurterProvider } from "./providers/frankfurter";

const provider = frankfurterProvider;

/**
 * Looks up a rate from `from` to `to`, for pre-filling the expense form.
 * Same-currency is always the trivial 1, resolved with no network call.
 * Everything else asks the configured ExchangeRateProvider and returns
 * null on any failure — the form always falls back to manual entry, and a
 * manually-entered rate is exactly as valid, just labeled `rate_source:
 * "manual"` instead of the provider's name (see toExpenseRow).
 */
export async function fetchExchangeRate(
  from: string,
  to: string,
): Promise<RateLookup | null> {
  if (from === to) return { rate: 1, source: "manual", rateDate: todayIso() };
  return provider.fetchRate(from, to);
}
