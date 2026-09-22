/**
 * Integer minor-unit arithmetic, mirroring `private.currency_exponent` in
 * supabase/migrations/0013_expense_splits.sql. Splitting, balances and
 * settlement all compute here — in minor units, never `number` multiplied
 * by a percentage — so a client-side preview always agrees with what the
 * database's deferred triggers will accept.
 */

/** Decimal places JPY has none of; every other supported currency has two. */
export function currencyExponent(code: string): number {
  return code === "JPY" ? 0 : 2;
}

/** €12.34 → 1234n. Assumes `amount` already has at most `currencyExponent` places. */
export function toMinorUnits(amount: number, currency: string): bigint {
  const exponent = currencyExponent(currency);
  const scaled = Math.round(amount * 10 ** exponent);
  return BigInt(scaled);
}

/** 1234n → 12.34 (JS number, safe: split/balance amounts never approach 2^53). */
export function fromMinorUnits(minor: bigint, currency: string): number {
  return Number(minor) / 10 ** currencyExponent(currency);
}

/**
 * Divides `total` minor units into `weights.length` integer shares
 * proportional to `weights`, using the largest-remainder method: every
 * share gets its floor allocation, then the leftover minor units (always
 * fewer than `weights.length`) go one each to the largest remainders,
 * ties broken by index. The result always sums to exactly `total` — no
 * rounding is ever silently dropped.
 */
export function allocateByWeight(total: bigint, weights: bigint[]): bigint[] {
  const weightSum = weights.reduce((a, b) => a + b, 0n);
  if (weightSum === 0n) {
    throw new Error("cannot allocate by all-zero weights");
  }
  const base: bigint[] = [];
  const remainders: { index: number; remainder: bigint }[] = [];
  let allocated = 0n;
  for (const [index, weight] of weights.entries()) {
    const share = (total * weight) / weightSum;
    const remainder = (total * weight) % weightSum;
    base.push(share);
    remainders.push({ index, remainder });
    allocated += share;
  }
  remainders.sort((a, b) => (b.remainder > a.remainder ? 1 : b.remainder < a.remainder ? -1 : a.index - b.index));
  let leftover = total - allocated;
  for (const { index } of remainders) {
    if (leftover <= 0n) break;
    base[index] += 1n;
    leftover -= 1n;
  }
  return base;
}
