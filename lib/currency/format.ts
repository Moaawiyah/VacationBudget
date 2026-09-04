/**
 * Formats a money amount using the correct symbol/placement for its currency.
 * `locale` is the current UI locale's BCP-47 tag (see lib/i18n/config.ts's
 * LOCALE_BCP47) — required, not defaulted, so every call site is forced to
 * thread through the user's actual language rather than silently falling
 * back to whatever the browser/server's own default happens to be.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
  }).format(amount);
}
