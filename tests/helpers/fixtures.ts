import type { TripInput } from "@/lib/validation/trip";
import type { ExpenseInput } from "@/lib/validation/expense";
import type { ExpenseWithCategory } from "@/types/expense";

export const CATEGORY_FOOD = "11111111-1111-4111-8111-111111111111";
export const CATEGORY_HOTEL = "22222222-2222-4222-8222-222222222222";

/** A trips row as Supabase returns it (numeric columns arrive as strings). */
export function tripRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "trip-1",
    user_id: "user-1",
    name: "Rome",
    description: null,
    destination: "Italy",
    start_date: "2026-10-01",
    end_date: "2026-10-10",
    base_currency: "EUR",
    total_budget: "1500.00",
    cover_image_url: null as string | null,
    cover_image_alt: null as string | null,
    cover_provider: null as string | null,
    cover_photographer: null as string | null,
    cover_photographer_url: null as string | null,
    cover_source_url: null as string | null,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    ...overrides,
  };
}

export const tripInput: TripInput = {
  name: "Rome",
  description: "",
  destination: "Italy",
  start_date: "2026-10-01",
  end_date: "2026-10-10",
  base_currency: "EUR",
  total_budget: 1500,
};

/** An expenses row as Supabase returns it. */
export function expenseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "exp-1",
    trip_id: "trip-1",
    user_id: "user-1",
    category_id: CATEGORY_FOOD,
    amount: "20.00",
    currency: "EUR",
    exchange_rate: "1",
    converted_amount: "20.00",
    description: "Pizza",
    expense_date: "2026-10-02",
    merchant: null,
    location: null,
    notes: null,
    created_at: "2026-10-02T12:00:00Z",
    updated_at: "2026-10-02T12:00:00Z",
    ...overrides,
  };
}

export const expenseInput: ExpenseInput = {
  amount: 20,
  currency: "EUR",
  exchange_rate: undefined,
  category_id: CATEGORY_FOOD,
  description: "Pizza",
  expense_date: "2026-10-02",
  merchant: "",
  location: "",
  notes: "",
};

/** A domain expense (numbers already parsed) with its category. */
export function expense(
  overrides: Partial<ExpenseWithCategory> = {},
): ExpenseWithCategory {
  return {
    ...(expenseRow() as unknown as ExpenseWithCategory),
    amount: 20,
    exchange_rate: 1,
    converted_amount: 20,
    category: { name: "Food", icon: "utensils" },
    ...overrides,
  };
}
