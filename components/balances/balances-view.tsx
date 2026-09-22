"use client";

import { useDictionary } from "@/components/i18n/locale-provider";
import type { Balance } from "@/lib/finance/balances";
import type { SettlementSuggestion } from "@/lib/finance/settlement";
import type { Settlement } from "@/lib/sdk/settlement-service";
import type { Companion } from "@/types/companion";
import { BalanceList } from "./balance-list";
import { SettleSuggestions } from "./settle-suggestions";
import { SettlementHistory } from "./settlement-history";

/**
 * Three clearly separate sections, per the spec: BALANCES (who's owed what,
 * right now — expenses folded together with anything already settled),
 * SETTLE UP (the minimal transfers that would zero every balance — computed
 * live, never stored), and history (transfers actually recorded). Expenses
 * themselves live on their own page; this one is never about what anything
 * cost.
 */
export function BalancesView({
  tripId,
  currentUserId,
  isOwner,
  companions,
  baseCurrency,
  balances,
  suggestions,
  settlements,
}: {
  tripId: string;
  currentUserId: string;
  isOwner: boolean;
  companions: Companion[];
  baseCurrency: string;
  balances: Balance[];
  suggestions: SettlementSuggestion[];
  settlements: Settlement[];
}) {
  const dict = useDictionary().balances;
  const byId = new Map(companions.map((c) => [c.userId, c]));

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {dict.balancesHeading}
        </h2>
        <BalanceList balances={balances} companions={byId} baseCurrency={baseCurrency} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          {dict.settleUpHeading}
        </h2>
        {suggestions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{dict.allSettled}</p>
        ) : (
          <SettleSuggestions
            tripId={tripId}
            currentUserId={currentUserId}
            isOwner={isOwner}
            companions={byId}
            baseCurrency={baseCurrency}
            suggestions={suggestions}
          />
        )}
      </section>

      {settlements.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
            {dict.historyHeading}
          </h2>
          <SettlementHistory
            tripId={tripId}
            currentUserId={currentUserId}
            isOwner={isOwner}
            companions={byId}
            baseCurrency={baseCurrency}
            settlements={settlements}
          />
        </section>
      )}
    </div>
  );
}
