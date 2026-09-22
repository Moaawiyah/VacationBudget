import { vi } from "vitest";
import type { ToolContext } from "@/lib/ai/tools/types";

/** A trip accessible to the caller, with just the fields the tools read. */
export function fakeTrip(overrides: Record<string, unknown> = {}) {
  return {
    id: "trip-1",
    name: "Italy",
    destination: "IT",
    start_date: "2026-06-01",
    end_date: "2026-06-10",
    base_currency: "EUR",
    total_budget: 1000,
    ...overrides,
  };
}

export function fakeExpense(overrides: Record<string, unknown> = {}) {
  return {
    id: "exp-1",
    expense_date: "2026-06-02",
    description: "Lunch",
    merchant: null,
    amount: 20,
    currency: "EUR",
    converted_amount: 20,
    category: { name: "Food", icon: "utensils" },
    ...overrides,
  };
}

/**
 * A minimal stand-in for VacationBudgetSDK — only the methods a given tool
 * actually calls need to be supplied; everything else is a spy that would
 * fail loudly (undefined is not a function) if a tool reached for it
 * unexpectedly.
 */
export function fakeContext(overrides: {
  trip?: unknown;
  expenses?: unknown[];
  expensesWithSplits?: unknown[];
  companions?: { userId: string; username: string; firstName: string; surname: string }[];
  settlements?: unknown[];
  plannedBudgets?: unknown[];
  categories?: unknown[];
}): ToolContext & { spies: { get: ReturnType<typeof vi.fn> } } {
  const get = vi.fn(async () => overrides.trip ?? null);
  const sdk = {
    trips: { get },
    expenses: {
      listForTrip: vi.fn(async () => overrides.expenses ?? []),
      listWithSplitsForTrip: vi.fn(async () => overrides.expensesWithSplits ?? []),
    },
    companions: {
      listForTrip: vi.fn(async () => ({ companions: overrides.companions ?? [], isOwner: true })),
    },
    settlements: { listForTrip: vi.fn(async () => overrides.settlements ?? []) },
    plannedBudgets: { listForTrip: vi.fn(async () => overrides.plannedBudgets ?? []) },
    categories: { list: vi.fn(async () => overrides.categories ?? []) },
  };
  return { sdk: sdk as never, userId: "user-1", spies: { get } };
}
