import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency/constants";

/** What the model returns — a single JSON object, never free-form prose. */
export const budgetPlanResponseSchema = z.object({
  categories: z
    .array(
      z.object({
        category: z.string().trim().min(1).max(50),
        amount: z.number().finite().nonnegative(),
      }),
    )
    .min(1)
    .max(15),
  /** Any caveat worth surfacing, e.g. "food estimate assumes mid-range restaurants". */
  notes: z.string().max(500).optional(),
});
export type BudgetPlanResponse = z.infer<typeof budgetPlanResponseSchema>;

export const travelStyleSchema = z.enum(["BUDGET", "BALANCED", "COMFORT"]);
export type TravelStyle = z.infer<typeof travelStyleSchema>;

/**
 * What the planner needs to propose an ALLOCATION of an already-fixed
 * total — not an estimate of what a trip costs from scratch (see this
 * module's own README-style comment in generate.ts). Everything here is
 * user-supplied; the planner never reads the database, so generating a
 * plan has no access boundary of its own to worry about.
 */
export const plannerInputSchema = z.object({
  destinations: z.string().trim().min(1).max(200),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  travelerCount: z.number().int().min(1).max(50),
  totalBudget: z.number().positive().max(10_000_000),
  baseCurrency: z.enum(CURRENCY_CODES),
  knownCosts: z
    .array(z.object({ label: z.string().trim().min(1).max(50), amount: z.number().nonnegative() }))
    .max(10)
    .optional(),
  travelStyle: travelStyleSchema.optional(),
  /** Free text — "we don't care about shopping but want good restaurants". Data, not instructions to change scope. */
  preferences: z.string().trim().max(500).optional(),
  /** The trip's existing category names, so the plan can reuse them instead of inventing near-duplicates. */
  categoryNames: z.array(z.string()).max(30).optional(),
  /**
   * A previously generated plan plus a change request — "increase food by
   * €200 and reduce shopping" — so Regenerate revises instead of starting
   * over. Still just data handed to the model; the result goes through the
   * same validator as a first-time plan.
   */
  revise: z
    .object({
      previousCategories: z.array(z.object({ category: z.string(), amount: z.number() })).max(15),
      instruction: z.string().trim().min(1).max(300),
    })
    .optional(),
});
export type PlannerInput = z.infer<typeof plannerInputSchema>;
