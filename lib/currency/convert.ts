/**
 * Converts an amount into the trip's base currency using a stored rate.
 * Phase 3 always passes rate 1 (expense currency == trip currency). Phase 6
 * adds a UI for entering a different currency + manual rate — this function
 * doesn't change, only its callers do.
 */
export function convertCurrency(amount: number, exchangeRate: number): number {
  return Math.round(amount * exchangeRate * 100) / 100;
}
