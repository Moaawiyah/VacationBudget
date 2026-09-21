import { Search } from "lucide-react";
import { ALL_CATEGORIES } from "@/lib/calculations/expense-list";
import { translateCategoryName } from "@/lib/i18n/category-names";
import type { Dictionary } from "@/lib/i18n/types";
import type { Category } from "@/types/category";

type ExpenseFiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  categories: Category[];
  dict: Dictionary;
};

/** Search box + category dropdown above the expense list. */
export function ExpenseFilters({
  search,
  onSearchChange,
  categoryId,
  onCategoryChange,
  categories,
  dict,
}: ExpenseFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
        />
        <input
          aria-label={dict.expenses.searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={dict.expenses.searchPlaceholder}
          className="border-border bg-card text-card-foreground focus:border-primary h-11 w-full rounded-2xl border ps-9 pe-3 text-sm outline-none"
        />
      </div>
      <div
        role="group"
        aria-label={dict.expenses.allCategories}
        className="flex gap-2 overflow-x-auto pb-2"
      >
        {[{ id: ALL_CATEGORIES, name: dict.expenses.allCategories }, ...categories].map(
          (category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => onCategoryChange(category.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-medium ${categoryId === category.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
            >
              {category.id === ALL_CATEGORIES
                ? category.name
                : translateCategoryName(category.name, dict)}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
