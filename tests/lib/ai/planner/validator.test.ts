import { describe, expect, it } from "vitest";
import { validateBudgetPlan } from "@/lib/ai/planner/validator";

const sumMinor = (categories: { amount: number }[], currency = "EUR") =>
  categories.reduce((sum, c) => sum + Math.round(c.amount * (currency === "JPY" ? 1 : 100)), 0);

describe("validateBudgetPlan — already-balanced input", () => {
  it("accepts a plan that already sums exactly to the total, unchanged", () => {
    const result = validateBudgetPlan(
      {
        categories: [
          { category: "Accommodation", amount: 1400 },
          { category: "Food", amount: 1250 },
          { category: "Car Rental", amount: 650 },
          { category: "Fuel", amount: 400 },
          { category: "Attractions", amount: 700 },
          { category: "Parking / Tolls", amount: 300 },
          { category: "Shopping", amount: 400 },
          { category: "Emergency", amount: 500 },
          { category: "Other", amount: 400 },
        ],
      },
      6000,
      "EUR",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.normalized).toBe(false);
    expect(sumMinor(result.plan.categories)).toBe(600000);
  });
});

describe("validateBudgetPlan — normalization", () => {
  it("rescales proportionally when the model's amounts don't add up, and always reconciles exactly", () => {
    // Model claims these add to €6000, but they actually sum to €5000.
    const result = validateBudgetPlan(
      {
        categories: [
          { category: "Accommodation", amount: 2000 },
          { category: "Food", amount: 2000 },
          { category: "Activities", amount: 1000 },
        ],
      },
      6000,
      "EUR",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.normalized).toBe(true);
    expect(sumMinor(result.plan.categories)).toBe(600000);
    // Ratio (2:2:1) is preserved: accommodation and food end up equal, larger than activities.
    const [accommodation, food, activities] = result.plan.categories.map((c) => c.amount);
    expect(accommodation).toBeCloseTo(food, 2);
    expect(activities).toBeLessThan(accommodation);
  });

  it("reconciles exactly even with an uneven three-way split (33.3.. repeating)", () => {
    const result = validateBudgetPlan(
      {
        categories: [
          { category: "A", amount: 1 },
          { category: "B", amount: 1 },
          { category: "C", amount: 1 },
        ],
      },
      100,
      "EUR",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(sumMinor(result.plan.categories)).toBe(10000);
  });
});

describe("validateBudgetPlan — rejection", () => {
  it("rejects an empty category list", () => {
    const result = validateBudgetPlan({ categories: [] }, 1000, "EUR");
    expect(result).toEqual({ ok: false, error: { reason: "no_categories" } });
  });

  it("rejects a negative amount rather than normalizing around it", () => {
    const result = validateBudgetPlan(
      { categories: [{ category: "Food", amount: -100 }, { category: "Other", amount: 1100 }] },
      1000,
      "EUR",
    );
    expect(result).toEqual({
      ok: false,
      error: { reason: "negative_amount", category: "Food" },
    });
  });

  it("rejects a duplicate category name (case-insensitive)", () => {
    const result = validateBudgetPlan(
      { categories: [{ category: "Food", amount: 500 }, { category: "food", amount: 500 }] },
      1000,
      "EUR",
    );
    expect(result).toEqual({
      ok: false,
      error: { reason: "duplicate_category", category: "food" },
    });
  });

  it("rejects an all-zero plan instead of dividing by zero", () => {
    const result = validateBudgetPlan(
      { categories: [{ category: "Food", amount: 0 }, { category: "Other", amount: 0 }] },
      1000,
      "EUR",
    );
    expect(result).toEqual({ ok: false, error: { reason: "zero_total" } });
  });
});

describe("validateBudgetPlan — currency precision", () => {
  it("never proposes a fractional yen", () => {
    const result = validateBudgetPlan(
      { categories: [{ category: "A", amount: 1 }, { category: "B", amount: 1 }, { category: "C", amount: 1 } ] },
      1000,
      "JPY",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.plan.categories.every((c) => Number.isInteger(c.amount))).toBe(true);
    expect(result.plan.categories.reduce((sum, c) => sum + c.amount, 0)).toBe(1000);
  });
});
