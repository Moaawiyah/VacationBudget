"use client";

import { Users } from "lucide-react";
import { formatCurrency } from "@/lib/currency/format";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import { companionDisplayName, type Companion } from "@/types/companion";
import { cn } from "@/lib/utils";
import type { SplitMethod } from "@/lib/finance/split";
import { Chip, ChipRow, Field } from "./split-chip";
import type { UseSplitFields } from "./use-split-fields";

const METHODS: SplitMethod[] = ["equal", "exact", "percentage"];

/**
 * "Paid by" / "Split" / "Participants", with a live per-person preview and
 * immediate validation — extends the same chip-and-card language the
 * category picker already uses, not a new visual pattern.
 */
export function SplitFields({
  split,
  companions,
  currency,
}: {
  split: UseSplitFields;
  companions: Companion[];
  currency: string;
}) {
  const dict = useDictionary();
  const { bcp47 } = useLocale();
  const t = dict.expenseForm;
  const { state, result } = split;

  const methodLabel: Record<SplitMethod, string> = {
    equal: t.splitEqual,
    exact: t.splitExact,
    percentage: t.splitPercentage,
  };

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => split.setEnabled(!state.enabled)}
        className={cn(
          "flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
          state.enabled
            ? "border-primary bg-primary/10 text-primary"
            : "border-border text-muted-foreground",
        )}
      >
        <Users aria-hidden className="h-4 w-4 shrink-0" />
        {t.splitToggle}
      </button>

      {state.enabled && (
        <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4">
          <Field label={t.paidBy}>
            <ChipRow>
              {companions.map((c) => (
                <Chip
                  key={c.userId}
                  selected={state.paidBy === c.userId}
                  onClick={() => split.setPaidBy(c.userId)}
                >
                  {companionDisplayName(c)}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label={t.splitMethod}>
            <ChipRow>
              {METHODS.map((method) => (
                <Chip
                  key={method}
                  selected={state.method === method}
                  onClick={() => split.setMethod(method)}
                >
                  {methodLabel[method]}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label={t.splitParticipants}>
            <ChipRow>
              {companions.map((c) => (
                <Chip
                  key={c.userId}
                  selected={state.participantIds.includes(c.userId)}
                  onClick={() => split.toggleParticipant(c.userId)}
                >
                  {companionDisplayName(c)}
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <div className="flex flex-col gap-2">
            {state.participantIds.map((userId) => {
              const person = companions.find((c) => c.userId === userId);
              const share = result?.ok
                ? result.shares.find((s) => s.userId === userId)
                : undefined;
              return (
                <div key={userId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-card-foreground truncate">
                    {person ? companionDisplayName(person) : userId}
                  </span>
                  {state.method === "exact" ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      value={state.exactAmounts[userId] ?? ""}
                      onChange={(e) => split.setExactAmount(userId, Number(e.target.value))}
                      className="border-border bg-background h-9 w-24 rounded-lg border px-2 text-end outline-none"
                    />
                  ) : state.method === "percentage" ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max="100"
                      value={state.percentages[userId] ?? ""}
                      onChange={(e) => split.setPercentage(userId, Number(e.target.value))}
                      className="border-border bg-background h-9 w-20 rounded-lg border px-2 text-end outline-none"
                    />
                  ) : (
                    <span className="text-muted-foreground">
                      {share ? formatCurrency(share.shareAmount, currency, bcp47) : "—"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {result && !result.ok && (
            <p className="text-danger text-sm">
              {t[`splitInvalid_${result.code}` as keyof typeof t] ?? t.splitInvalid_generic}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
