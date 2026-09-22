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
 * Tries a live rate whenever the currency changes, and tags where it came
 * from — "frankfurter" when the lookup filled it in, "manual" for the
 * trivial same-currency case or whenever it can't be looked up (the field
 * stays editable either way; the user's own number is exactly as valid,
 * just labeled differently). Historical expenses are never revisited: this
 * only runs while the form for *this* expense is open.
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
      setValue("rate_source", undefined);
      setValue("rate_date", undefined);
      return;
    }
    let cancelled = false;
    fetchExchangeRate(currency, baseCurrency).then((lookup) => {
      if (cancelled) return;
      if (lookup !== null) {
        setValue("exchange_rate", lookup.rate);
        setValue("rate_source", lookup.source as "manual" | "frankfurter");
        setValue("rate_date", lookup.rateDate);
      } else {
        setValue("rate_source", "manual");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [currency, baseCurrency, setValue]);
}

/**
 * Marking a rate "manual" the moment the person edits it — even one that
 * started as a provider lookup — is the "clearly marked" override the FX
 * spec calls for, without any UI beyond the rate field itself.
 */
export function markRateManualOnEdit(setValue: SetValue) {
  setValue("rate_source", "manual");
}
