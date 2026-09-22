"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { getAIProvider } from "@/lib/ai/provider";
import { generateBudgetPlan } from "@/lib/ai/planner/generate";
import type { ValidatedBudgetPlan } from "@/lib/ai/planner/validator";
import type { Dictionary } from "@/lib/i18n/types";

const formSchema = z.object({
  travelerCount: z.coerce.number().int().min(1).max(50),
  travelStyle: z.enum(["BUDGET", "BALANCED", "COMFORT"]).optional(),
  preferences: z.string().trim().max(500).optional(),
  knownCosts: z
    .array(z.object({ label: z.string().trim().min(1).max(50), amount: z.coerce.number().nonnegative() }))
    .max(10)
    .optional(),
  revise: z
    .object({
      previousCategories: z.array(z.object({ category: z.string(), amount: z.number() })).max(15),
      instruction: z.string().trim().min(1).max(300),
    })
    .optional(),
});

function rejectionMessage(
  error: { reason: string; category?: string },
  dict: Dictionary["ai"],
): string {
  switch (error.reason) {
    case "no_categories":
      return dict.rejectedNoCategories;
    case "duplicate_category":
      return interpolate(dict.rejectedDuplicate, { category: error.category ?? "" });
    case "negative_amount":
      return interpolate(dict.rejectedNegative, { category: error.category ?? "" });
    default:
      return dict.rejectedZeroTotal;
  }
}

export async function generateAiBudgetPlan(
  tripId: string,
  input: unknown,
): Promise<{ plan: ValidatedBudgetPlan } | { error: string }> {
  const dict = await getDictionary();
  const { sdk, user } = await requireUser();

  const trip = await sdk.trips.get(tripId);
  if (!trip || trip.user_id !== user.id) return { error: dict.errors.planOwnerOnly };

  const parsed = formSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? dict.validation.amountInvalid };
  }

  const provider = getAIProvider();
  if (!provider) return { error: dict.ai.unavailablePlanner };

  const categories = await sdk.categories.list();
  const result = await generateBudgetPlan(provider, {
    destinations: trip.destination,
    startDate: trip.start_date,
    endDate: trip.end_date,
    totalBudget: trip.total_budget,
    baseCurrency: trip.base_currency,
    travelerCount: parsed.data.travelerCount,
    travelStyle: parsed.data.travelStyle,
    preferences: parsed.data.preferences,
    knownCosts: parsed.data.knownCosts,
    revise: parsed.data.revise,
    categoryNames: categories.map((c) => c.name),
  });

  if (result.ok) return { plan: result.plan };
  if (result.reason === "rejected") return { error: rejectionMessage(result.error, dict.ai) };
  return { error: dict.ai.generateError };
}

/**
 * The only step that writes anything — called only when the user presses
 * "Apply Budget". Category names that don't already exist become new
 * custom categories (CategoryService.create, the same path the manual
 * "+ New" category button uses); every amount then goes through
 * PlannedBudgetService.upsert, the same write the manual Plan screen uses.
 */
export async function applyAiBudgetPlan(
  tripId: string,
  categories: { category: string; amount: number }[],
): Promise<{ error?: string }> {
  const dict = await getDictionary();
  const { sdk, user } = await requireUser();

  if (!(await sdk.trips.isOwnedBy(user.id, tripId))) return { error: dict.errors.planOwnerOnly };

  const existing = await sdk.categories.listPickable(user.id);
  const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]));

  for (const { category, amount } of categories) {
    let categoryId = byName.get(category.trim().toLowerCase());
    if (!categoryId) {
      const created = await sdk.categories.create(user.id, category.trim());
      if ("error" in created) return { error: dict.ai.applyError };
      categoryId = created.category.id;
      byName.set(category.trim().toLowerCase(), categoryId);
    }
    const result = await sdk.plannedBudgets.upsert(tripId, categoryId, amount);
    if (result.error) return { error: dict.ai.applyError };
  }

  revalidatePath(`/trip/${tripId}/plan`);
  revalidatePath(`/trip/${tripId}/dashboard`);
  return {};
}
