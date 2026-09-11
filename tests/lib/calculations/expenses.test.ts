import { describe, expect, it } from "vitest";
import {
  findHighestSpendingDay,
  findLargestExpense,
  findMostExpensiveCategory,
  groupExpensesByCategory,
  groupExpensesByDate,
  mergePlannedAndActual,
} from "@/lib/calculations/expenses";
import {
  ALL_CATEGORIES,
  filterExpenses,
  groupExpensesByDay,
} from "@/lib/calculations/expense-list";
import { CATEGORY_FOOD, CATEGORY_HOTEL, expense } from "../../helpers/fixtures";

const hotel = {
  category_id: CATEGORY_HOTEL,
  category: { name: "Accommodation", icon: "bed" },
};
const expenses = [
  expense({ id: "a", expense_date: "2026-10-03", converted_amount: 30 }),
  expense({
    id: "b",
    expense_date: "2026-10-02",
    converted_amount: 20,
    merchant: "Trattoria",
  }),
  expense({ id: "c", expense_date: "2026-10-02", converted_amount: 100, ...hotel }),
];

describe("spending breakdowns", () => {
  it("totals spend per day, earliest first", () => {
    expect(groupExpensesByDate(expenses)).toEqual([
      { date: "2026-10-02", amount: 120 },
      { date: "2026-10-03", amount: 30 },
    ]);
  });

  it("finds the highest day and the largest expense (null when empty)", () => {
    expect(findHighestSpendingDay(expenses)).toEqual({ date: "2026-10-02", amount: 120 });
    expect(findLargestExpense(expenses)?.id).toBe("c");
    expect(findHighestSpendingDay([])).toBeNull();
    expect(findLargestExpense([])).toBeNull();
  });

  it("totals spend per category, highest first", () => {
    expect(groupExpensesByCategory(expenses).map((c) => [c.name, c.amount])).toEqual([
      ["Accommodation", 100],
      ["Food", 50],
    ]);
    expect(findMostExpensiveCategory(expenses)?.categoryId).toBe(CATEGORY_HOTEL);
    expect(findMostExpensiveCategory([])).toBeNull();
  });

  it("merges planned and actual, dropping categories with neither", () => {
    const created_at = "2026-01-01T00:00:00Z";
    const categories = [
      { id: CATEGORY_FOOD, user_id: null, name: "Food", icon: "utensils", created_at },
      {
        id: CATEGORY_HOTEL,
        user_id: null,
        name: "Accommodation",
        icon: "bed",
        created_at,
      },
      { id: "unused", user_id: null, name: "Tolls", icon: "road", created_at },
    ];
    const planned = [
      { id: "p", trip_id: "t", category_id: CATEGORY_FOOD, planned_amount: 400 },
    ];
    const merged = mergePlannedAndActual(categories, planned as never, expenses);
    expect(merged.map((c) => [c.name, c.planned, c.actual])).toEqual([
      ["Food", 400, 50],
      ["Accommodation", 0, 100],
    ]);
  });
});

describe("expense list filtering", () => {
  it("matches description or merchant, case-insensitively", () => {
    expect(filterExpenses(expenses, "PIZZA", ALL_CATEGORIES)).toHaveLength(3);
    expect(filterExpenses(expenses, "tratt", ALL_CATEGORIES).map((e) => e.id)).toEqual([
      "b",
    ]);
    expect(filterExpenses(expenses, "sushi", ALL_CATEGORIES)).toEqual([]);
  });

  it("filters by category", () => {
    expect(filterExpenses(expenses, " ", CATEGORY_HOTEL).map((e) => e.id)).toEqual(["c"]);
  });

  it("groups by day, keeping the incoming order", () => {
    expect(groupExpensesByDay(expenses).map(([day, list]) => [day, list.length])).toEqual(
      [
        ["2026-10-03", 1],
        ["2026-10-02", 2],
      ],
    );
  });
});
