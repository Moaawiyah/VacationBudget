import {
  calculateRemainingDays,
  calculateTripDays,
  calculateTripStatus,
} from "@/lib/calculations/trip";
import type { TripStatus } from "@/types/trip";

export type BudgetForecast = {
  status: TripStatus;
  totalTripDays: number;
  /** Full days already behind "today" — 0 on the trip's first day or before it starts. */
  daysElapsed: number;
  /** "Today" through the trip's end, inclusive — 0 once the trip is over. */
  daysRemaining: number;
  totalBudget: number;
  spent: number;
  /** totalBudget - spent. Negative once over budget. */
  remaining: number;
  /** spent / daysElapsed. 0 before there's a full day of history to average. */
  averageDailySpend: number;
  /**
   * remaining / daysRemaining. Can go negative — that's not a bug, it's the
   * honest answer once no daily amount could still land on budget (see
   * "already over budget" below). 0 once the trip is over.
   */
  recommendedDailySpend: number;
  /** Today's pace (averageDailySpend), extrapolated across the days left. */
  projectedFinalSpend: number;
  /** totalBudget - projectedFinalSpend. Positive: projected to finish under. */
  projectedOverUnder: number;
  /** Already true today, independent of any projection. */
  isOverBudget: boolean;
};

/**
 * A deterministic read on trip spending — no LLM, no estimation, just the
 * same arithmetic a spreadsheet would do. Pure numbers in, pure numbers
 * out: `spent`/`totalBudget` are the caller's to compute (e.g. by summing
 * expenses already scoped to the trip's date range and currency), so this
 * function never has to decide which expenses count.
 *
 * Edge cases fall out of the formulas rather than needing their own branch:
 * a trip that hasn't started has daysElapsed 0 (so averageDailySpend 0, and
 * projectedFinalSpend is just whatever's already been spent); a completed
 * trip has daysRemaining 0 (so the projection collapses to the real total,
 * and recommendedDailySpend is 0 — there's nothing left to plan for); a
 * zero budget or an already-over-budget trip both fall out of `remaining`
 * simply going negative, which recommendedDailySpend and projectedOverUnder
 * then correctly report as negative too, instead of being clamped away.
 */
export function calculateBudgetForecast(
  startDate: string,
  endDate: string,
  totalBudget: number,
  spent: number,
  now: Date = new Date(),
): BudgetForecast {
  const status = calculateTripStatus(startDate, endDate, now);
  const totalTripDays = calculateTripDays(startDate, endDate);
  const daysRemaining =
    status === "upcoming"
      ? totalTripDays
      : status === "completed"
        ? 0
        : calculateRemainingDays(endDate, now);
  const daysElapsed = totalTripDays - daysRemaining;

  const remaining = totalBudget - spent;
  const averageDailySpend = daysElapsed > 0 ? spent / daysElapsed : 0;
  const recommendedDailySpend = daysRemaining > 0 ? remaining / daysRemaining : 0;
  const projectedFinalSpend = spent + averageDailySpend * daysRemaining;

  return {
    status,
    totalTripDays,
    daysElapsed,
    daysRemaining,
    totalBudget,
    spent,
    remaining,
    averageDailySpend,
    recommendedDailySpend,
    projectedFinalSpend,
    projectedOverUnder: totalBudget - projectedFinalSpend,
    isOverBudget: spent > totalBudget,
  };
}
