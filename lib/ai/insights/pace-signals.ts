import type { BudgetForecast } from "@/lib/finance/forecast";
import type { ExpenseWithCategory } from "@/types/expense";
import { materialThreshold, roundMoney, score, type ScoredSignal } from "./signals";

const ACCELERATION_WINDOW_DAYS = 2;

/** The trip's i-th calendar day as YYYY-MM-DD (day 0 = start date). */
function tripDate(startDate: string, index: number): string {
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + index);
  return d.toISOString().slice(0, 10);
}

function totalOnDays(expenses: ExpenseWithCategory[], dates: Set<string>): number {
  return expenses.reduce((sum, e) => (dates.has(e.expense_date) ? sum + e.converted_amount : sum), 0);
}

/**
 * Whether the last couple of complete trip days ran well above the days
 * before them. Only complete days count (today is still in progress), and
 * only once there's enough history for "before" to mean something.
 */
export function accelerationSignal(
  forecast: BudgetForecast,
  expenses: ExpenseWithCategory[],
  startDate: string,
  currency: string,
): ScoredSignal[] {
  const { daysElapsed, totalBudget } = forecast;
  const earlierDays = daysElapsed - ACCELERATION_WINDOW_DAYS;
  if (earlierDays < 3) return [];
  const range = (from: number, to: number) =>
    new Set(Array.from({ length: to - from }, (_, i) => tripDate(startDate, from + i)));
  const recent = totalOnDays(expenses, range(earlierDays, daysElapsed)) / ACCELERATION_WINDOW_DAYS;
  const earlier = totalOnDays(expenses, range(0, earlierDays)) / earlierDays;
  if (recent <= earlier * 1.5 || recent - earlier <= materialThreshold(totalBudget)) return [];
  return [
    {
      signal: {
        signal: "DAILY_SPENDING_ACCELERATING",
        windowDays: ACCELERATION_WINDOW_DAYS,
        recentDailyAverage: roundMoney(recent, currency),
        earlierDailyAverage: roundMoney(earlier, currency),
      },
      score: score(50, recent - earlier, totalBudget),
    },
  ];
}

/**
 * A single expense from today or yesterday that's both a real share of the
 * budget and far above this trip's typical expense. Only its category and
 * amount are passed on — never its description or merchant, which are
 * free text the model has no need to see here.
 */
export function largeRecentExpenseSignal(
  forecast: BudgetForecast,
  expenses: ExpenseWithCategory[],
  startDate: string,
  currency: string,
): ScoredSignal[] {
  const { daysElapsed, totalBudget } = forecast;
  if (expenses.length < 5) return [];
  const sorted = expenses.map((e) => e.converted_amount).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const today = tripDate(startDate, daysElapsed);
  const yesterday = daysElapsed > 0 ? tripDate(startDate, daysElapsed - 1) : null;
  const candidates = expenses.filter(
    (e) =>
      (e.expense_date === today || e.expense_date === yesterday) &&
      e.converted_amount >= totalBudget * 0.1 &&
      e.converted_amount >= median * 3,
  );
  if (candidates.length === 0) return [];
  const largest = candidates.reduce((max, e) => (e.converted_amount > max.converted_amount ? e : max));
  return [
    {
      signal: {
        signal: "LARGE_RECENT_EXPENSE",
        category: largest.category.name,
        amount: roundMoney(largest.converted_amount, currency),
        when: largest.expense_date === today ? "today" : "yesterday",
      },
      score: score(60, largest.converted_amount, totalBudget),
    },
  ];
}
