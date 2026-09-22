import { describe, expect, it } from "vitest";
import { calculateBudgetForecast } from "@/lib/finance/forecast";

// A 12-day trip (Jan 1–12), "today" on day 6 → 5 full days elapsed, 7 left —
// the worked example from the spec (€3000 budget, €1840 spent, €368/day pace).
const START = "2026-01-01";
const END = "2026-01-12";
const DAY_6 = new Date("2026-01-06T09:00:00Z");

describe("calculateBudgetForecast", () => {
  it("matches the worked example: 5 elapsed, 7 remaining, €368/day pace, projected over", () => {
    const forecast = calculateBudgetForecast(START, END, 3000, 1840, DAY_6);
    expect(forecast.status).toBe("active");
    expect(forecast.totalTripDays).toBe(12);
    expect(forecast.daysElapsed).toBe(5);
    expect(forecast.daysRemaining).toBe(7);
    expect(forecast.remaining).toBe(1160);
    expect(forecast.averageDailySpend).toBe(368);
    expect(forecast.recommendedDailySpend).toBeCloseTo(1160 / 7, 10);
    expect(forecast.projectedFinalSpend).toBe(4416);
    expect(forecast.projectedOverUnder).toBe(-1416);
    expect(forecast.isOverBudget).toBe(false); // not yet — only projected to be
  });

  it("a trip that hasn't started has no pace yet, and nothing is elapsed", () => {
    const forecast = calculateBudgetForecast(START, END, 3000, 0, new Date("2025-12-20"));
    expect(forecast.status).toBe("upcoming");
    expect(forecast.daysElapsed).toBe(0);
    expect(forecast.daysRemaining).toBe(12);
    expect(forecast.averageDailySpend).toBe(0);
    expect(forecast.projectedFinalSpend).toBe(0);
    expect(forecast.recommendedDailySpend).toBeCloseTo(250, 10); // flat 3000/12
  });

  it("on the first day, elapsed is still 0 (no full day of history yet)", () => {
    const forecast = calculateBudgetForecast(
      START,
      END,
      3000,
      100,
      new Date("2026-01-01T20:00:00Z"),
    );
    expect(forecast.status).toBe("active");
    expect(forecast.daysElapsed).toBe(0);
    expect(forecast.daysRemaining).toBe(12);
    expect(forecast.averageDailySpend).toBe(0); // can't average over zero days
    expect(forecast.projectedFinalSpend).toBe(100); // no pace to extrapolate — just today's spend
  });

  it("a completed trip has no days left to plan for, and projects exactly what happened", () => {
    const forecast = calculateBudgetForecast(START, END, 3000, 3200, new Date("2026-02-01"));
    expect(forecast.status).toBe("completed");
    expect(forecast.daysElapsed).toBe(12);
    expect(forecast.daysRemaining).toBe(0);
    expect(forecast.recommendedDailySpend).toBe(0);
    expect(forecast.projectedFinalSpend).toBe(3200);
    expect(forecast.isOverBudget).toBe(true);
  });

  it("a zero budget reports every cent spent as over, without dividing by the budget", () => {
    const forecast = calculateBudgetForecast(START, END, 0, 50, DAY_6);
    expect(forecast.remaining).toBe(-50);
    expect(forecast.isOverBudget).toBe(true);
    expect(forecast.recommendedDailySpend).toBeLessThan(0);
    expect(Number.isFinite(forecast.recommendedDailySpend)).toBe(true);
  });

  it("already over budget: remaining and recommendedDailySpend go negative rather than clamping", () => {
    const forecast = calculateBudgetForecast(START, END, 1000, 1500, DAY_6);
    expect(forecast.isOverBudget).toBe(true);
    expect(forecast.remaining).toBe(-500);
    expect(forecast.recommendedDailySpend).toBeCloseTo(-500 / 7, 10);
    expect(forecast.projectedOverUnder).toBeLessThan(0);
  });
});
