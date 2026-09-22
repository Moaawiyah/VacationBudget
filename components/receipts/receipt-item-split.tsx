"use client";

import { useMemo, useState } from "react";
import { allocateByWeight, toMinorUnits, fromMinorUnits } from "@/lib/finance/money";
import { formatCurrency } from "@/lib/currency/format";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import { companionDisplayName, type Companion } from "@/types/companion";
import { Chip, ChipRow, Field } from "@/components/expenses/split-chip";
import { Button } from "@/components/ui/button";
import type { ReceiptLineItem } from "@/types/receipt";

/**
 * Assigns each traveler to the items they actually had, splitting a shared
 * item evenly among whoever's assigned to it. Anything not itemized — tax,
 * a service charge, a discount, or just rounding — is the gap between the
 * assigned items and the expense's own total, and is spread across
 * travelers in proportion to what they were already assigned; nobody's
 * share is ever silently dropped. Reuses the existing extraction
 * (line_items) — no OCR or LLM work happens here.
 */
export function ReceiptItemSplit({
  onApply,
  companions,
  currentUserId,
  amount,
  currency,
  items,
}: {
  onApply: (paidBy: string, amounts: Record<string, number>) => void;
  companions: Companion[];
  currentUserId: string;
  amount: number;
  currency: string;
  items: ReceiptLineItem[];
}) {
  const dict = useDictionary().expenseForm;
  const { bcp47 } = useLocale();
  const itemized = useMemo(() => items.filter((i) => i.total_price != null), [items]);
  const [assignments, setAssignments] = useState<string[][]>(() => itemized.map(() => []));

  const amounts = useMemo(
    () => computeItemSplit(itemized, assignments, companions.map((c) => c.userId), amount, currency),
    [itemized, assignments, companions, amount, currency],
  );

  function toggle(itemIndex: number, userId: string) {
    setAssignments((prev) =>
      prev.map((ids, i) =>
        i !== itemIndex
          ? ids
          : ids.includes(userId)
            ? ids.filter((id) => id !== userId)
            : [...ids, userId],
      ),
    );
  }

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-4">
      {itemized.map((item, i) => (
        <Field key={i} label={`${item.icon} ${item.description}`}>
          <ChipRow>
            {companions.map((c) => (
              <Chip
                key={c.userId}
                selected={assignments[i]?.includes(c.userId) ?? false}
                onClick={() => toggle(i, c.userId)}
              >
                {companionDisplayName(c)}
              </Chip>
            ))}
          </ChipRow>
        </Field>
      ))}

      <div className="flex flex-col gap-1.5 border-t pt-3">
        {companions.map((c) => (
          <div key={c.userId} className="flex items-center justify-between text-sm">
            <span className="text-card-foreground truncate">{companionDisplayName(c)}</span>
            <span className="text-muted-foreground">
              {formatCurrency(amounts[c.userId] ?? 0, currency, bcp47)}
            </span>
          </div>
        ))}
      </div>

      <Button type="button" variant="secondary" onClick={() => onApply(currentUserId, amounts)}>
        {dict.splitUseItemSplit}
      </Button>
    </div>
  );
}

/**
 * Item weights are split evenly among assignees (allocateByWeight over
 * that item's own minor units); the remainder — everything not itemized —
 * is then spread proportionally to what each traveler was already
 * assigned, so the whole thing always adds back up to `amount` exactly.
 */
export function computeItemSplit(
  items: ReceiptLineItem[],
  assignments: string[][],
  everyone: string[],
  amount: number,
  currency: string,
): Record<string, number> {
  const totalMinor = toMinorUnits(amount, currency);
  const perPerson = new Map<string, bigint>(everyone.map((id) => [id, 0n]));

  items.forEach((item, i) => {
    const assignees = assignments[i];
    if (!assignees?.length || item.total_price == null) return;
    const itemMinor = toMinorUnits(item.total_price, currency);
    const shares = allocateByWeight(itemMinor, assignees.map(() => 1n));
    assignees.forEach((id, j) => perPerson.set(id, (perPerson.get(id) ?? 0n) + shares[j]));
  });

  const assignedTotal = [...perPerson.values()].reduce((a, b) => a + b, 0n);
  const remainder = totalMinor - assignedTotal;
  const weights = everyone.map((id) => perPerson.get(id) ?? 0n);
  // Nothing assigned yet (a fresh receipt): spread the whole total evenly
  // instead of dividing the remainder by an all-zero weight.
  const remainderShares = weights.every((w) => w === 0n)
    ? allocateByWeight(remainder, everyone.map(() => 1n))
    : allocateByWeight(remainder, weights);

  const result: Record<string, number> = {};
  everyone.forEach((id, i) => {
    const total = (perPerson.get(id) ?? 0n) + remainderShares[i];
    result[id] = fromMinorUnits(total, currency);
  });
  return result;
}
