"use client";

import { useState, useTransition } from "react";
import { ArrowRight, Check } from "lucide-react";
import { formatCurrency } from "@/lib/currency/format";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import type { SettlementSuggestion } from "@/lib/finance/settlement";
import { companionDisplayName, type Companion } from "@/types/companion";
import { newRequestId } from "@/lib/request-id";
import { markSettlementPaid } from "@/app/trip/[id]/balances/actions";
import { cn } from "@/lib/utils";

/**
 * The minimal transfers that would zero every balance, computed live —
 * never persisted until someone actually taps "Mark Paid" (0015's
 * record_settlement). Only the trip owner or one of the two people in a
 * given transfer may record it, mirroring who may record a settlement in
 * the database (0015) — matching the button to who could actually save.
 */
export function SettleSuggestions({
  tripId,
  currentUserId,
  isOwner,
  companions,
  baseCurrency,
  suggestions,
}: {
  tripId: string;
  currentUserId: string;
  isOwner: boolean;
  companions: Map<string, Companion>;
  baseCurrency: string;
  suggestions: SettlementSuggestion[];
}) {
  const dict = useDictionary().balances;
  const { bcp47 } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [paid, setPaid] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function markPaid(index: number, suggestion: SettlementSuggestion) {
    setError(null);
    startTransition(async () => {
      const result = await markSettlementPaid(
        tripId,
        suggestion.fromUserId,
        suggestion.toUserId,
        suggestion.amount,
        newRequestId(),
      );
      if ("error" in result) setError(result.error);
      else setPaid((prev) => new Set(prev).add(index));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {suggestions.map((suggestion, index) => {
        const canRecord =
          isOwner ||
          currentUserId === suggestion.fromUserId ||
          currentUserId === suggestion.toUserId;
        const from = companions.get(suggestion.fromUserId);
        const to = companions.get(suggestion.toUserId);
        const done = paid.has(index);
        return (
          <div
            key={index}
            className="border-border bg-card flex items-center justify-between gap-3 rounded-2xl border p-4"
          >
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="text-card-foreground truncate font-medium">
                {from ? companionDisplayName(from) : suggestion.fromUserId}
              </span>
              <ArrowRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
              <span className="text-card-foreground truncate font-medium">
                {to ? companionDisplayName(to) : suggestion.toUserId}
              </span>
              <span className="text-muted-foreground shrink-0">
                {formatCurrency(suggestion.amount, baseCurrency, bcp47)}
              </span>
            </div>
            {canRecord && (
              <button
                type="button"
                disabled={done || isPending}
                onClick={() => markPaid(index, suggestion)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-opacity disabled:pointer-events-none",
                  done
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-primary-foreground active:opacity-80",
                )}
              >
                <Check aria-hidden className="size-3.5 shrink-0" />
                {done ? dict.markedPaid : dict.markPaid}
              </button>
            )}
          </div>
        );
      })}
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
}
