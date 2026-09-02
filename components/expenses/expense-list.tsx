"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateHeading } from "@/lib/format-date";
import type { ExpenseWithCategory } from "@/types/expense";
import type { Category } from "@/types/category";

type ExpenseListProps = {
  tripId: string;
  expenses: ExpenseWithCategory[];
  categories: Category[];
  baseCurrency: string;
};

export function ExpenseList({
  tripId,
  expenses,
  categories,
  baseCurrency,
}: ExpenseListProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return expenses.filter((expense) => {
      const matchesSearch =
        query === "" ||
        expense.description.toLowerCase().includes(query) ||
        (expense.merchant ?? "").toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === "all" || expense.category_id === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, search, categoryFilter]);

  // `expenses` arrives pre-sorted (expense_date desc) from the server query,
  // so grouping by insertion order keeps that order — no re-sort needed here.
  const grouped = useMemo(() => {
    const map = new Map<string, ExpenseWithCategory[]>();
    for (const expense of filtered) {
      const list = map.get(expense.expense_date) ?? [];
      list.push(expense);
      map.set(expense.expense_date, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (expenses.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
        <p className="text-muted-foreground text-sm">
          No expenses yet.
          <br />
          Add your first vacation expense.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses"
            className="border-border bg-card text-card-foreground focus:border-primary h-11 w-full rounded-2xl border pr-3 pl-9 text-sm outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border-border bg-card text-card-foreground focus:border-primary h-11 shrink-0 rounded-2xl border px-3 text-sm outline-none"
        >
          <option value="all">All</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 ? (
        <p className="text-muted-foreground py-8 text-center text-sm">
          No matching expenses.
        </p>
      ) : (
        grouped.map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <h2 className="text-muted-foreground text-sm font-medium">
              {formatDateHeading(date)}
            </h2>
            <div className="flex flex-col gap-2">
              {items.map((expense) => {
                return (
                  <Link
                    key={expense.id}
                    href={`/trip/${tripId}/expenses/${expense.id}/edit`}
                    className="border-border bg-card flex items-center gap-3 rounded-2xl border p-3"
                  >
                    <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                      <CategoryIcon
                        icon={expense.category.icon}
                        className="text-muted-foreground h-5 w-5"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-card-foreground truncate text-sm font-medium">
                        {expense.description}
                      </p>
                      <p className="text-muted-foreground truncate text-xs">
                        {expense.category.name}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-card-foreground text-sm font-semibold">
                        {formatCurrency(expense.converted_amount, baseCurrency)}
                      </p>
                      {expense.currency !== baseCurrency && (
                        <p className="text-muted-foreground text-xs">
                          {formatCurrency(expense.amount, expense.currency)}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
