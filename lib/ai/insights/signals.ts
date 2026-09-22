import { fromMinorUnits, toMinorUnits } from "@/lib/finance/money";

/**
 * Every fact an insight can state, computed here in code before any model
 * sees it. The model only turns one of these into a sentence — it never
 * receives raw expenses and never computes a figure (see explain.ts, which
 * also rejects any sentence quoting a number that isn't in these facts).
 * All amounts are in the trip's base currency, rounded to its minor unit.
 */
export type SpendingSignal =
  | {
      signal: "TRIP_PROJECTED_OVER_BUDGET";
      totalBudget: number;
      spent: number;
      projectedFinalSpend: number;
      projectedOverBy: number;
      daysRemaining: number;
      /** remaining / daysRemaining — spend at most this per day to land on budget. Omitted once nothing is left. */
      recommendedDailySpend?: number;
      /** Current daily average minus recommendedDailySpend. */
      dailyReductionNeeded?: number;
    }
  | {
      signal: "TRIP_PROJECTED_UNDER_BUDGET";
      totalBudget: number;
      projectedFinalSpend: number;
      projectedUnderBy: number;
      daysRemaining: number;
      recommendedDailySpend: number;
    }
  | {
      signal: "CATEGORY_OVER_PLAN" | "CATEGORY_UNDER_PLAN";
      category: string;
      planned: number;
      spent: number;
      expectedByToday: number;
      projected: number;
      /** projected - planned: positive over plan, negative under. */
      projectedDifference: number;
    }
  | {
      signal: "DAILY_SPENDING_ACCELERATING";
      windowDays: number;
      recentDailyAverage: number;
      earlierDailyAverage: number;
    }
  | { signal: "LARGE_RECENT_EXPENSE"; category: string; amount: number; when: "today" | "yesterday" }
  | {
      signal: "LOW_REMAINING_DAILY_BUDGET";
      remaining: number;
      daysRemaining: number;
      recommendedDailySpend: number;
      originalDailyBudget: number;
    }
  | {
      signal: "HEALTHY_BUDGET_PACE";
      remaining: number;
      daysRemaining: number;
      recommendedDailySpend: number;
      projectedFinalSpend: number;
    };

export type SignalName = SpendingSignal["signal"];

/**
 * An empty signal list is the NO_MEANINGFUL_INSIGHT outcome: nothing worth
 * saying, so no model call is made and the dashboard shows no card.
 */
export const NO_MEANINGFUL_INSIGHT: readonly SpendingSignal[] = Object.freeze([]);

export type ScoredSignal = { signal: SpendingSignal; score: number };

/** Rounds to the currency's minor unit, reusing the same helpers splitting uses. */
export function roundMoney(amount: number, currency: string): number {
  return fromMinorUnits(toMinorUnits(amount, currency), currency);
}

/** Below this, a difference is noise rather than an insight: 1% of the trip budget. */
export function materialThreshold(totalBudget: number): number {
  return Math.max(totalBudget * 0.01, 1);
}

/** Adds how big a deviation is (relative to the whole budget, capped) to a base priority. */
export function score(base: number, amount: number, totalBudget: number): number {
  const relative = totalBudget > 0 ? (Math.abs(amount) / totalBudget) * 100 : 0;
  return base + Math.min(relative, 20);
}
