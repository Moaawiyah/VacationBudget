"use client";

import { Plus, X } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Chip, ChipRow, Field } from "@/components/expenses/split-chip";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { TravelStyle } from "@/lib/ai/planner/schema";

export type PlannerFormState = {
  travelerCount: number;
  travelStyle: TravelStyle | undefined;
  preferences: string;
  knownCosts: { label: string; amount: number }[];
};

const STYLES: TravelStyle[] = ["BUDGET", "BALANCED", "COMFORT"];

/** The planner's input form — travelers, style, known fixed costs, free-text priorities. */
export function AiPlannerForm({
  value,
  onChange,
  onSubmit,
  isGenerating,
}: {
  value: PlannerFormState;
  onChange: (next: PlannerFormState) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}) {
  const dict = useDictionary().ai;
  const styleLabel: Record<TravelStyle, string> = {
    BUDGET: dict.travelStyleBudget,
    BALANCED: dict.travelStyleBalanced,
    COMFORT: dict.travelStyleComfort,
  };

  function addKnownCost() {
    onChange({ ...value, knownCosts: [...value.knownCosts, { label: "", amount: 0 }] });
  }
  function setKnownCost(index: number, patch: Partial<{ label: string; amount: number }>) {
    onChange({
      ...value,
      knownCosts: value.knownCosts.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    });
  }
  function removeKnownCost(index: number) {
    onChange({ ...value, knownCosts: value.knownCosts.filter((_, i) => i !== index) });
  }

  return (
    <div className="flex flex-col gap-4">
      <Input
        label={dict.travelersLabel}
        type="number"
        min="1"
        value={value.travelerCount}
        onChange={(e) => onChange({ ...value, travelerCount: Number(e.target.value) })}
      />

      <Field label={dict.travelStyleLabel}>
        <ChipRow>
          {STYLES.map((style) => (
            <Chip
              key={style}
              selected={value.travelStyle === style}
              onClick={() => onChange({ ...value, travelStyle: style })}
            >
              {styleLabel[style]}
            </Chip>
          ))}
        </ChipRow>
      </Field>

      <Field label={dict.knownCostsLabel}>
        <div className="flex flex-col gap-2">
          {value.knownCosts.map((cost, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={cost.label}
                onChange={(e) => setKnownCost(i, { label: e.target.value })}
                placeholder={dict.knownCostLabelPlaceholder}
                className="border-border bg-background h-10 flex-1 rounded-xl border px-3 text-sm outline-none"
              />
              <input
                type="number"
                min="0"
                value={cost.amount}
                onChange={(e) => setKnownCost(i, { amount: Number(e.target.value) })}
                className="border-border bg-background h-10 w-24 rounded-xl border px-2 text-end text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => removeKnownCost(i)}
                aria-label={dict.removeKnownCost}
                className="text-danger grid size-10 shrink-0 place-items-center"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addKnownCost}
            className="border-border text-muted-foreground flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-2 text-sm"
          >
            <Plus aria-hidden className="size-4" />
            {dict.addKnownCost}
          </button>
        </div>
      </Field>

      <Textarea
        label={dict.preferencesLabel}
        placeholder={dict.preferencesPlaceholder}
        value={value.preferences}
        onChange={(e) => onChange({ ...value, preferences: e.target.value })}
      />

      <Button type="button" loading={isGenerating} onClick={onSubmit}>
        {dict.generatePlan}
      </Button>
    </div>
  );
}
