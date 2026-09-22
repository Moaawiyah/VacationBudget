"use client";

import { useState, useTransition } from "react";
import { ArrowRight, X } from "lucide-react";
import { formatCurrency } from "@/lib/currency/format";
import { useLocale } from "@/components/i18n/locale-provider";
import type { Settlement } from "@/lib/sdk/settlement-service";
import { companionDisplayName, type Companion } from "@/types/companion";
import { deleteSettlement } from "@/app/trip/[id]/balances/actions";

/** Recorded transfers, newest first — a log of what actually happened, distinct from the live suggestions above it. */
export function SettlementHistory({
  tripId,
  currentUserId,
  isOwner,
  companions,
  baseCurrency,
  settlements,
}: {
  tripId: string;
  currentUserId: string;
  isOwner: boolean;
  companions: Map<string, Companion>;
  baseCurrency: string;
  settlements: Settlement[];
}) {
  const { bcp47 } = useLocale();
  const [isPending, startTransition] = useTransition();
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteSettlement(tripId, id);
      if ("error" in result) setError(result.error);
      else setRemoved((prev) => new Set(prev).add(id));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {settlements
        .filter((s) => !removed.has(s.id))
        .map((settlement) => {
          const from = companions.get(settlement.fromUserId);
          const to = companions.get(settlement.toUserId);
          const canRemove =
            isOwner ||
            currentUserId === settlement.fromUserId ||
            currentUserId === settlement.toUserId;
          return (
            <div
              key={settlement.id}
              className="border-border bg-card flex items-center justify-between gap-3 rounded-2xl border p-4 text-sm"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-card-foreground truncate font-medium">
                    {from ? companionDisplayName(from) : settlement.fromUserId}
                  </span>
                  <ArrowRight aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
                  <span className="text-card-foreground truncate font-medium">
                    {to ? companionDisplayName(to) : settlement.toUserId}
                  </span>
                  <span className="text-muted-foreground shrink-0">
                    {formatCurrency(settlement.amount, baseCurrency, bcp47)}
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {new Intl.DateTimeFormat(bcp47, { dateStyle: "medium" }).format(
                    new Date(settlement.createdAt),
                  )}
                </span>
              </div>
              {canRemove && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => remove(settlement.id)}
                  aria-label="Remove"
                  className="text-danger hover:bg-danger/10 grid size-8 shrink-0 place-items-center rounded-full disabled:pointer-events-none"
                >
                  <X aria-hidden className="size-4" />
                </button>
              )}
            </div>
          );
        })}
      {error && <p className="text-danger text-sm">{error}</p>}
    </div>
  );
}
