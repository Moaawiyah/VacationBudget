import { z } from "zod";
import type { VacationBudgetSDK } from "@/lib/sdk/sdk";

/** What Apply Budget sends — the previewed plan, possibly hand-edited, so still untrusted input. */
export const appliedPlanSchema = z
  .array(z.object({ category: z.string().trim().min(1).max(50), amount: z.number().finite().nonnegative() }))
  .min(1)
  .max(15);
export type AppliedPlan = z.infer<typeof appliedPlanSchema>;

export type ApplyResult = { ok: true } | { ok: false; reason: "invalid" | "forbidden" | "write_failed" };

/**
 * Makes the trip's planned budgets exactly the confirmed plan. Category
 * names that don't exist yet become the user's own custom categories (the
 * same CategoryService.create the manual "+ New" button uses), and every
 * amount goes through PlannedBudgetService.upsert, the manual Plan screen's
 * own write. Any category planned earlier but left out of this plan is set
 * to 0 — otherwise "Total planned" would silently drift above the total the
 * preview just showed and the user confirmed.
 */
export async function applyBudgetPlan(
  sdk: VacationBudgetSDK,
  userId: string,
  tripId: string,
  input: unknown,
): Promise<ApplyResult> {
  const parsed = appliedPlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid" };
  if (!(await sdk.trips.isOwnedBy(userId, tripId))) return { ok: false, reason: "forbidden" };

  const [existing, previouslyPlanned] = await Promise.all([
    sdk.categories.listPickable(userId),
    sdk.plannedBudgets.listForTrip(tripId),
  ]);
  const byName = new Map(existing.map((c) => [c.name.trim().toLowerCase(), c.id]));
  const applied = new Set<string>();

  for (const { category, amount } of parsed.data) {
    const key = category.toLowerCase();
    let categoryId = byName.get(key);
    if (!categoryId) {
      const created = await sdk.categories.create(userId, category);
      if ("error" in created) return { ok: false, reason: "write_failed" };
      categoryId = created.category.id;
      byName.set(key, categoryId);
    }
    if ((await sdk.plannedBudgets.upsert(tripId, categoryId, amount)).error) {
      return { ok: false, reason: "write_failed" };
    }
    applied.add(categoryId);
  }

  for (const stale of previouslyPlanned) {
    if (applied.has(stale.category_id) || stale.planned_amount === 0) continue;
    if ((await sdk.plannedBudgets.upsert(tripId, stale.category_id, 0)).error) {
      return { ok: false, reason: "write_failed" };
    }
  }
  return { ok: true };
}
