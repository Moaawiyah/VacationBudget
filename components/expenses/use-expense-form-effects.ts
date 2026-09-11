"use client";

import { useEffect } from "react";
import type { UseFormSetValue } from "react-hook-form";
import type { z } from "zod";
import { fetchExchangeRate } from "@/lib/currency/exchange-rate";
import type { expenseFields } from "@/lib/validation/expense";
import type { Category } from "@/types/category";

/** The raw form fields, before Zod coercion (e.g. amount as typed). */
export type ExpenseFormValues = z.input<ReturnType<typeof expenseFields>>;
type SetValue = UseFormSetValue<ExpenseFormValues>;

const recentCategoryKey = (tripId: string) => `vacation-budget:recent-category:${tripId}`;

/** Remembers the category just used on this trip, for the next new expense. */
export function saveRecentCategory(tripId: string, categoryId: string) {
  window.localStorage.setItem(recentCategoryKey(tripId), categoryId);
}

/** On mount, pre-selects the remembered category, if it still exists. */
export function useRecentCategory(
  enabled: boolean,
  tripId: string,
  categories: Category[],
  setValue: SetValue,
) {
  useEffect(() => {
    if (!enabled) return;
    const remembered = window.localStorage.getItem(recentCategoryKey(tripId));
    if (remembered && categories.some((c) => c.id === remembered)) {
      setValue("category_id", remembered);
    }
    // Only on mount — this is a one-time default, not a live sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Tries a live rate whenever the currency changes. fetchExchangeRate()
 * returns null until a real provider is wired up (see its own comment), so
 * today this only clears the rate for the same-currency case — the user
 * enters foreign-currency rates manually. Nothing else changes later.
 */
export function useLiveExchangeRate(
  currency: string | undefined,
  baseCurrency: string,
  setValue: SetValue,
) {
  useEffect(() => {
    if (!currency) return;
    if (currency === baseCurrency) {
      setValue("exchange_rate", undefined);
      return;
    }
    let cancelled = false;
    fetchExchangeRate(currency, baseCurrency).then((rate) => {
      if (!cancelled && rate !== null) setValue("exchange_rate", rate);
    });
    return () => {
      cancelled = true;
    };
  }, [currency, baseCurrency, setValue]);
}
