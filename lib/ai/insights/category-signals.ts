import type { BudgetForecast } from "@/lib/finance/forecast";
import type { PlannedActualSpend } from "@/lib/calculations/expenses";
import type { ExpenseWithCategory } from "@/types/expense";
import { materialThreshold, roundMoney, score, type ScoredSignal } from "./signals";

/**
 * Planned-vs-actual pace per category. A category's projection extrapolates
 * only what was spent in it since the trip started — a hotel paid in full
 * before departure is a one-off, not a daily pace, so it's counted in
 * `spent` but never multiplied across the remaining days.
 */
export function categorySignals(
  forecast: BudgetForecast,
  planned: PlannedActualSpend[],
  expenses: ExpenseWithCategory[],
  startDate: string,
  currency: string,
): ScoredSignal[] {
  const { daysElapsed, daysRemaining, totalTripDays, totalBudget } = forecast;
  if (daysElapsed < 2) return [];
  const threshold = materialThreshold(totalBudget);
  const inTripByCategory = new Map<string, number>();
  for (const e of expenses) {
    if (e.expense_date < startDate) continue;
    inTripByCategory.set(e.category_id, (inTripByCategory.get(e.category_id) ?? 0) + e.converted_amount);
  }

  const signals: ScoredSignal[] = [];
  for (const c of planned) {
    if (c.planned <= 0) continue;
    const inTrip = inTripByCategory.get(c.categoryId) ?? 0;
    const projected = c.actual + (inTrip / daysElapsed) * daysRemaining;
    const expectedByToday = (c.planned * daysElapsed) / totalTripDays;
    const difference = projected - c.planned;
    const facts = {
      category: c.name,
      planned: roundMoney(c.planned, currency),
      spent: roundMoney(c.actual, currency),
      expectedByToday: roundMoney(expectedByToday, currency),
      projected: roundMoney(projected, currency),
      projectedDifference: roundMoney(difference, currency),
    };
    const minimum = Math.max(threshold, c.planned * 0.1);
    if (difference > minimum && c.actual > expectedByToday) {
      signals.push({ signal: { signal: "CATEGORY_OVER_PLAN", ...facts }, score: score(80, difference, totalBudget) });
    } else if (daysElapsed / totalTripDays >= 0.5 && -difference > minimum) {
      signals.push({ signal: { signal: "CATEGORY_UNDER_PLAN", ...facts }, score: score(20, difference, totalBudget) });
    }
  }
  return signals;
}
