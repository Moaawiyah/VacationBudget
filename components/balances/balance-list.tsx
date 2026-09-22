"use client";

import { formatCurrency } from "@/lib/currency/format";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import type { Balance } from "@/lib/finance/balances";
import { companionDisplayName, type Companion } from "@/types/companion";
import { cn } from "@/lib/utils";

/** One row per participant: what they're owed, owe, or (rounded to the
 * currency's own minor unit) are settled up on. */
export function BalanceList({
  balances,
  companions,
  baseCurrency,
}: {
  balances: Balance[];
  companions: Map<string, Companion>;
  baseCurrency: string;
}) {
  const dict = useDictionary().balances;
  const { bcp47 } = useLocale();

  return (
    <div className="flex flex-col gap-2">
      {balances.map((balance) => {
        const person = companions.get(balance.userId);
        const cents = Math.round(balance.netBalance * 100);
        return (
          <div
            key={balance.userId}
            className="border-border bg-card flex items-center justify-between gap-3 rounded-2xl border p-4"
          >
            <span className="text-card-foreground truncate font-medium">
              {person ? companionDisplayName(person) : balance.userId}
            </span>
            <div className="text-end">
              <p
                className={cn(
                  "font-semibold",
                  cents > 0 && "text-success",
                  cents < 0 && "text-danger",
                  cents === 0 && "text-muted-foreground",
                )}
              >
                {formatCurrency(Math.abs(balance.netBalance), baseCurrency, bcp47)}
              </p>
              <p className="text-muted-foreground text-xs">
                {cents > 0 ? dict.isOwed : cents < 0 ? dict.owes : dict.settledUp}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
