"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { generateAiBudgetPlan, applyAiBudgetPlan } from "@/app/trip/[id]/plan/ai-actions";
import type { ValidatedBudgetPlan } from "@/lib/ai/planner/validator";
import { AiPlannerForm, type PlannerFormState } from "./ai-planner-form";
import { AiBudgetPlanPreview } from "./ai-budget-plan-preview";

type Phase = "collapsed" | "form" | "generating" | "preview" | "applying" | "applied";

const initialForm: PlannerFormState = {
  travelerCount: 1,
  travelStyle: undefined,
  preferences: "",
  knownCosts: [],
};

/**
 * The whole "Generate Budget Plan" flow for one trip. Nothing here writes
 * anything until Apply Budget: generating and revising only ever call the
 * read-only generateAiBudgetPlan action, which validates deterministically
 * but never touches the database (see app/trip/[id]/plan/ai-actions.ts).
 */
export function AiBudgetPlanner({ tripId }: { tripId: string }) {
  const dict = useDictionary().ai;
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("collapsed");
  const [form, setForm] = useState(initialForm);
  const [plan, setPlan] = useState<ValidatedBudgetPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(revise?: { previousCategories: { category: string; amount: number }[]; instruction: string }) {
    setPhase("generating");
    setError(null);
    const result = await generateAiBudgetPlan(tripId, { ...form, revise });
    if ("error" in result) {
      setError(result.error);
      setPhase(plan ? "preview" : "form");
      return;
    }
    setPlan(result.plan);
    setPhase("preview");
  }

  async function apply(categories: { category: string; amount: number }[]) {
    setPhase("applying");
    setError(null);
    const result = await applyAiBudgetPlan(tripId, categories);
    if (result.error) {
      setError(result.error);
      setPhase("preview");
      return;
    }
    setPhase("applied");
    router.refresh();
  }

  if (phase === "collapsed" || phase === "applied") {
    return (
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setPhase("form")}
          className="border-primary/40 text-primary flex items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-semibold"
        >
          <Sparkles aria-hidden className="size-4 shrink-0" />
          {dict.generatePlan}
        </button>
        {phase === "applied" && <p className="text-success text-center text-sm">{dict.applied}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-danger text-sm">{error}</p>}
      {!plan && (phase === "form" || phase === "generating") && (
        <AiPlannerForm
          value={form}
          onChange={setForm}
          onSubmit={() => generate()}
          isGenerating={phase === "generating"}
        />
      )}
      {plan && (phase === "preview" || phase === "applying" || phase === "generating") && (
        <AiBudgetPlanPreview
          plan={plan}
          isApplying={phase === "applying" || phase === "generating"}
          onRevise={(instruction) => generate({ previousCategories: plan.categories, instruction })}
          onApply={apply}
          onCancel={() => setPhase("collapsed")}
        />
      )}
    </div>
  );
}
