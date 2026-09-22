import { allocateByWeight, fromMinorUnits, toMinorUnits } from "@/lib/finance/money";
import type { BudgetPlanResponse } from "./schema";

export type ValidatedBudgetPlan = {
  categories: { category: string; amount: number }[];
  totalBudget: number;
  currency: string;
  /** True when the model's own amounts didn't add up and were rescaled — shown to the user, never hidden. */
  normalized: boolean;
  notes?: string;
};

export type BudgetPlanValidationError =
  | { reason: "no_categories" }
  | { reason: "duplicate_category"; category: string }
  | { reason: "negative_amount"; category: string }
  | { reason: "zero_total"; };

export type BudgetPlanValidationResult =
  | { ok: true; plan: ValidatedBudgetPlan }
  | { ok: false; error: BudgetPlanValidationError };

/**
 * The AI is never trusted to add up. This recomputes the sum itself, in
 * integer minor units (never floats — lib/finance/money.ts, the same
 * module every other financial calculation in the app uses), and forces
 * it to equal `totalBudget` exactly:
 *
 * - Already reconciles (rounding aside)? Left as proposed, past currency
 *   precision.
 * - Doesn't reconcile, but every amount is a valid non-negative number and
 *   at least one is nonzero? Rescaled proportionally with the same
 *   largest-remainder allocation a real split uses — the ratio the model
 *   proposed is kept, but the total becomes exactly `totalBudget`.
 * - Empty, all-zero, a negative amount, or a duplicate category name?
 *   Rejected outright — never silently invented or dropped.
 */
export function validateBudgetPlan(
  response: BudgetPlanResponse,
  totalBudget: number,
  currency: string,
): BudgetPlanValidationResult {
  if (response.categories.length === 0) return { ok: false, error: { reason: "no_categories" } };

  const seen = new Set<string>();
  for (const c of response.categories) {
    const key = c.category.trim().toLowerCase();
    if (seen.has(key)) return { ok: false, error: { reason: "duplicate_category", category: c.category } };
    seen.add(key);
    if (c.amount < 0) return { ok: false, error: { reason: "negative_amount", category: c.category } };
  }

  const totalMinor = toMinorUnits(totalBudget, currency);
  const weights = response.categories.map((c) => toMinorUnits(c.amount, currency));
  const weightSum = weights.reduce((a, b) => a + b, 0n);
  if (weightSum === 0n) return { ok: false, error: { reason: "zero_total" } };

  const proposedMinor = weights.reduce((a, b) => a + b, 0n);
  const alreadyBalanced = proposedMinor === totalMinor;
  const shares = alreadyBalanced ? weights : allocateByWeight(totalMinor, weights);

  return {
    ok: true,
    plan: {
      currency,
      totalBudget,
      normalized: !alreadyBalanced,
      notes: response.notes,
      categories: response.categories.map((c, i) => ({
        category: c.category.trim(),
        amount: fromMinorUnits(shares[i], currency),
      })),
    },
  };
}
