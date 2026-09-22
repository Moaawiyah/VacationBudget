import { calculateBudgetForecast, type BudgetForecast } from "@/lib/finance/forecast";
import type { PlannedActualSpend } from "@/lib/calculations/expenses";
import type { ExpenseWithCategory } from "@/types/expense";
import { categorySignals } from "./category-signals";
import { accelerationSignal, largeRecentExpenseSignal } from "./pace-signals";
import {
  materialThreshold,
  NO_MEANINGFUL_INSIGHT,
  roundMoney,
  score,
  type ScoredSignal,
  type SpendingSignal,
} from "./signals";

const MAX_SIGNALS = 3;
const MAX_CATEGORY_SIGNALS = 2;

export type SignalInput = {
  trip: { start_date: string; end_date: string; total_budget: number; base_currency: string };
  expenses: ExpenseWithCategory[];
  plannedVsActual: PlannedActualSpend[];
  now?: Date;
};

/** Whole-trip projection signals, straight from lib/finance/forecast.ts. */
function tripSignals(f: BudgetForecast, currency: string): ScoredSignal[] {
  const money = (n: number) => roundMoney(n, currency);
  const threshold = materialThreshold(f.totalBudget);
  const hasPace = f.daysElapsed >= 2 && f.daysRemaining > 0;
  const originalDaily = f.totalBudget / f.totalTripDays;
  const signals: ScoredSignal[] = [];

  if ((hasPace || f.isOverBudget) && -f.projectedOverUnder > threshold) {
    const canRecover = f.recommendedDailySpend > 0;
    signals.push({
      signal: {
        signal: "TRIP_PROJECTED_OVER_BUDGET",
        totalBudget: money(f.totalBudget),
        spent: money(f.spent),
        projectedFinalSpend: money(f.projectedFinalSpend),
        projectedOverBy: money(-f.projectedOverUnder),
        daysRemaining: f.daysRemaining,
        ...(canRecover && {
          recommendedDailySpend: money(f.recommendedDailySpend),
          dailyReductionNeeded: money(f.averageDailySpend - f.recommendedDailySpend),
        }),
      },
      score: score(100, f.projectedOverUnder, f.totalBudget),
    });
  } else if (hasPace && f.projectedOverUnder > f.totalBudget * 0.1) {
    signals.push({
      signal: {
        signal: "TRIP_PROJECTED_UNDER_BUDGET",
        totalBudget: money(f.totalBudget),
        projectedFinalSpend: money(f.projectedFinalSpend),
        projectedUnderBy: money(f.projectedOverUnder),
        daysRemaining: f.daysRemaining,
        recommendedDailySpend: money(f.recommendedDailySpend),
      },
      score: score(25, f.projectedOverUnder, f.totalBudget),
    });
  } else if (f.daysRemaining > 0 && f.remaining > 0 && f.recommendedDailySpend < originalDaily * 0.5) {
    signals.push({
      signal: {
        signal: "LOW_REMAINING_DAILY_BUDGET",
        remaining: money(f.remaining),
        daysRemaining: f.daysRemaining,
        recommendedDailySpend: money(f.recommendedDailySpend),
        originalDailyBudget: money(originalDaily),
      },
      score: 45,
    });
  } else if (hasPace) {
    // Not materially over, not far under, daily allowance intact: on track.
    signals.push({
      signal: {
        signal: "HEALTHY_BUDGET_PACE",
        remaining: money(f.remaining),
        daysRemaining: f.daysRemaining,
        recommendedDailySpend: money(f.recommendedDailySpend),
        projectedFinalSpend: money(f.projectedFinalSpend),
      },
      score: 10,
    });
  }
  return signals;
}

/**
 * The deterministic half of Spending Insights: every detector runs on
 * already-computed finance figures, candidates are ranked, and at most the
 * top three survive — or none (NO_MEANINGFUL_INSIGHT), in which case no
 * model call is ever made. Pure: the same input always yields the same
 * signals. Only an in-progress trip gets insights — before it starts there's
 * no pace, and a finished trip already has its own report.
 */
export function detectSignals({ trip, expenses, plannedVsActual, now = new Date() }: SignalInput): readonly SpendingSignal[] {
  const forecast = calculateBudgetForecast(
    trip.start_date,
    trip.end_date,
    trip.total_budget,
    expenses.reduce((sum, e) => sum + e.converted_amount, 0),
    now,
  );
  if (forecast.status !== "active" || trip.total_budget <= 0) return NO_MEANINGFUL_INSIGHT;
  const currency = trip.base_currency;

  const trips = tripSignals(forecast, currency);
  const categories = categorySignals(forecast, plannedVsActual, expenses, trip.start_date, currency)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CATEGORY_SIGNALS);
  const others = [
    ...accelerationSignal(forecast, expenses, trip.start_date, currency),
    ...largeRecentExpenseSignal(forecast, expenses, trip.start_date, currency),
  ];
  // "Healthy pace" is only worth saying when there's nothing sharper to say.
  const sharp = [...trips, ...categories, ...others].filter((s) => s.signal.signal !== "HEALTHY_BUDGET_PACE");
  const ranked = sharp.length > 0 ? sharp : trips;
  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SIGNALS)
    .map((s) => s.signal);
}
