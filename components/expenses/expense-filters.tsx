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
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={dict.expenses.searchPlaceholder}
          className="border-border bg-card text-card-foreground focus:border-primary h-11 w-full rounded-2xl border ps-9 pe-3 text-sm outline-none"
        />
      </div>
      <select
        value={categoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
        className="border-border bg-card text-card-foreground focus:border-primary h-11 shrink-0 rounded-2xl border px-3 text-sm outline-none"
      >
        <option value={ALL_CATEGORIES}>{dict.expenses.allCategories}</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {translateCategoryName(category.name, dict)}
          </option>
        ))}
      </select>
    </div>
  );
}
