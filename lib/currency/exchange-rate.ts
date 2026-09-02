/**
 * Looks up a live exchange rate from `from` to `to`. Returns null when no
 * rate is available, which is always (aside from the trivial same-currency
 * case) in this version — no live provider is wired up, and the project
 * spec explicitly forbids faking one. The UI falls back to manual entry
 * whenever this returns null.
 *
 * Swapping in a real provider later (exchangerate.host, Fixer, Open
 * Exchange Rates, ...) means implementing the fetch here — nothing else
 * in the app needs to change, since every caller already handles null.
 */
export async function fetchExchangeRate(
  from: string,
  to: string,
): Promise<number | null> {
  if (from === to) return 1;
  return null;
}
