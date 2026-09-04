"use client";

import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/currency/format";
import { upsertPlannedBudget } from "@/app/trip/[id]/plan/actions";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

type PlanCategoryRowProps = {
  tripId: string;
  categoryId: string;
  categoryName: string;
  icon: string;
  currency: string;
  plannedAmount: number;
  actualAmount: number;
};

export function PlanCategoryRow({
  tripId,
  categoryId,
  categoryName,
  icon,
  currency,
  plannedAmount,
  actualAmount,
}: PlanCategoryRowProps) {
  const dict = useDictionary();
  const { bcp47 } = useLocale();
  const [value, setValue] = useState(plannedAmount > 0 ? String(plannedAmount) : "");
  const [isPending, startTransition] = useTransition();

  const planned = Number(value) || 0;
  const remaining = planned - actualAmount;
  const isOver = remaining < 0;
  const showBreakdown = planned > 0 || actualAmount > 0;

  function handleBlur() {
    const parsed = Number(value) || 0;
    if (parsed === plannedAmount) return;
    startTransition(() => {
      upsertPlannedBudget(tripId, categoryId, parsed);
    });
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
          <CategoryIcon icon={icon} className="text-muted-foreground h-4 w-4" />
        </div>
        <p className="text-card-foreground flex-1 truncate text-sm font-medium">
          {categoryName}
        </p>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-sm">{currency}</span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleBlur}
            disabled={isPending}
            placeholder="0"
            className="border-border bg-background text-foreground focus:border-primary w-20 rounded-lg border px-2 py-1 text-end text-sm outline-none disabled:opacity-50"
          />
        </div>
      </div>
      {showBreakdown && (
        <div className="text-muted-foreground mt-2 flex items-center justify-between ps-12 text-xs">
          <span>
            {interpolate(dict.plan.actualLabel, {
              amount: formatCurrency(actualAmount, currency, bcp47),
            })}
          </span>
          <span className={cn("font-medium", isOver ? "text-danger" : "text-success")}>
            {isOver
              ? interpolate(dict.plan.over, {
                  amount: formatCurrency(Math.abs(remaining), currency, bcp47),
                })
              : interpolate(dict.plan.left, {
                  amount: formatCurrency(remaining, currency, bcp47),
                })}
          </span>
        </div>
      )}
    </div>
  );
}
