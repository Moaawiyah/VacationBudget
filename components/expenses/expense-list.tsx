"use client";

import { useMemo, useState } from "react";
import { Receipt, SearchX } from "lucide-react";
import {
  ALL_CATEGORIES,
  filterExpenses,
  groupExpensesByDay,
} from "@/lib/calculations/expense-list";
import { formatDateHeading } from "@/lib/format-date";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import type { ExpenseWithCategory } from "@/types/expense";
import type { Category } from "@/types/category";
import { ExpenseFilters } from "./expense-filters";
import { ExpenseRow } from "./expense-row";
import { payerLabel } from "./payer-label";

type ExpenseListProps = {
  tripId: string;
  expenses: ExpenseWithCategory[];
  categories: Category[];
  baseCurrency: string;
  /** userId → display name (see payer-label.ts); without it rows show no payer. */
  payerNames?: Record<string, string>;
  currentUserId?: string | null;
};

export function ExpenseList({
  tripId,
  expenses,
  categories,
  baseCurrency,
  payerNames,
  currentUserId = null,
}: ExpenseListProps) {
  const dict = useDictionary();
  const { bcp47 } = useLocale();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);

  const grouped = useMemo(
    () => groupExpensesByDay(filterExpenses(expenses, search, categoryFilter)),
    [expenses, search, categoryFilter],
  );

  if (expenses.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-2xl">
          <Receipt aria-hidden className="text-muted-foreground h-6 w-6" />
        </div>
        <p className="text-muted-foreground text-sm">
          {dict.expenses.noExpensesTitle}
          <br />
          {dict.expenses.noExpensesSubtitle}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ExpenseFilters
        search={search}
        onSearchChange={setSearch}
        categoryId={categoryFilter}
        onCategoryChange={setCategoryFilter}
        categories={categories}
        dict={dict}
      />

      {grouped.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-8 text-center text-sm">
          <SearchX aria-hidden className="h-5 w-5" />
          <p>{dict.expenses.noMatching}</p>
        </div>
      ) : (
        grouped.map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <h2 className="text-muted-foreground text-sm font-medium">
              {formatDateHeading(
                date,
                bcp47,
                dict.expenses.today,
                dict.expenses.yesterday,
              )}
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  tripId={tripId}
                  expense={expense}
                  baseCurrency={baseCurrency}
                  bcp47={bcp47}
                  dict={dict}
                  payer={
                    payerNames &&
                    payerLabel(expense.paid_by, currentUserId, payerNames, dict.expenses)
                  }
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
