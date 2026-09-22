"use client";

import { useMemo, useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";
import { formatCurrency } from "@/lib/currency/format";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import { validateBudgetPlan } from "@/lib/ai/planner/validator";
import type { ValidatedBudgetPlan } from "@/lib/ai/planner/validator";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Amounts are always editable inline. Apply is disabled until the visible
 * total matches the trip's own budget exactly — the same reconciliation
 * validateBudgetPlan enforces server-side, reused here client-side so a
 * manual tweak gets the identical "does this add up" answer without a
 * round trip. "Balance automatically" re-runs that same normalizer instead
 * of asking the user to do arithmetic by hand.
 */
export function AiBudgetPlanPreview({
  plan,
  onRevise,
  onApply,
  onCancel,
  isApplying,
}: {
  plan: ValidatedBudgetPlan;
  onRevise: (instruction: string) => void;
  onApply: (categories: { category: string; amount: number }[]) => void;
  onCancel: () => void;
  isApplying: boolean;
}) {
  const dict = useDictionary().ai;
  const { bcp47 } = useLocale();
  const [categories, setCategories] = useState(plan.categories);
  const [revision, setRevision] = useState("");

  const total = useMemo(() => categories.reduce((sum, c) => sum + c.amount, 0), [categories]);
  const balanced = Math.round(total * 100) === Math.round(plan.totalBudget * 100);

  function setAmount(index: number, amount: number) {
    setCategories((prev) => prev.map((c, i) => (i === index ? { ...c, amount } : c)));
  }

  function autoBalance() {
    const result = validateBudgetPlan({ categories }, plan.totalBudget, plan.currency);
    if (result.ok) setCategories(result.plan.categories);
  }

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-3xl border p-5">
      <div className="flex items-center gap-2">
        <Sparkles aria-hidden className="text-primary size-4 shrink-0" />
        <h3 className="text-card-foreground font-semibold">{dict.generatePlan.replace("✨ ", "")}</h3>
      </div>

      {plan.normalized && <p className="text-muted-foreground text-sm">{dict.normalizedNotice}</p>}
      {plan.notes && (
        <p className="text-muted-foreground text-sm">
          <span className="font-medium">{dict.plannerNotes}: </span>
          {plan.notes}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {categories.map((c, i) => (
          <div key={c.category} className="flex items-center justify-between gap-3">
            <span className="text-card-foreground truncate text-sm">{c.category}</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={c.amount}
              onChange={(e) => setAmount(i, Number(e.target.value))}
              className="border-border bg-background h-9 w-28 rounded-lg border px-2 text-end text-sm outline-none"
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t pt-3 text-sm font-semibold">
        <span>{dict.planTotal}</span>
        <span className={cn(!balanced && "text-danger")}>
          {formatCurrency(total, plan.currency, bcp47)} / {formatCurrency(plan.totalBudget, plan.currency, bcp47)}
        </span>
      </div>
      {!balanced && (
        <button type="button" onClick={autoBalance} className="text-primary flex items-center gap-1.5 self-start text-sm font-medium">
          <Wand2 aria-hidden className="size-4 shrink-0" />
          {dict.regenerate}
        </button>
      )}

      <div className="flex flex-col gap-2">
        <input
          value={revision}
          onChange={(e) => setRevision(e.target.value)}
          placeholder={dict.revisePlaceholder}
          className="border-border bg-background h-10 rounded-xl border px-3 text-sm outline-none"
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!revision.trim()}
          onClick={() => onRevise(revision.trim())}
        >
          {dict.reviseSubmit}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={!balanced}
          loading={isApplying}
          onClick={() => onApply(categories)}
        >
          {dict.applyBudget}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {dict.cancel}
        </Button>
      </div>
    </div>
  );
}
