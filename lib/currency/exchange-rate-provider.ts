/**
 * What any external rate source has to answer: a rate, which provider gave
 * it, and which calendar date it's quoted for. Swapping providers means
 * writing something that returns this shape — nothing else in the app
 * needs to change (lib/currency/exchange-rate.ts is the only caller).
 */
export type RateLookup = { rate: number; source: string; rateDate: string };

export interface ExchangeRateProvider {
  readonly source: string;
  /** Resolves to null on any failure (network, non-200, malformed body) — never throws. */
  fetchRate(from: string, to: string): Promise<RateLookup | null>;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
