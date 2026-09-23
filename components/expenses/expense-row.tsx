import Link from "next/link";
import { CategoryIcon } from "@/components/ui/category-icon";
import { formatCurrency } from "@/lib/currency/format";
import { translateCategoryName } from "@/lib/i18n/category-names";
import type { Dictionary } from "@/lib/i18n/types";
import type { ExpenseWithCategory } from "@/types/expense";

type ExpenseRowProps = {
  tripId: string;
  expense: ExpenseWithCategory;
  baseCurrency: string;
  bcp47: string;
  dict: Dictionary;
  /** "Paid by Alex" — omitted where the caller doesn't know the trip's people. */
  payer?: string | null;
};

/** One tappable expense: icon, description, category, amount (+ converted amount). */
export function ExpenseRow({
  tripId,
  expense,
  baseCurrency,
  bcp47,
  dict,
  payer,
}: ExpenseRowProps) {
  return (
    <Link
      href={`/trip/${tripId}/expenses/${expense.id}/edit`}
      className="border-border bg-card hover:border-border hover:bg-muted/50 flex items-center gap-3 rounded-2xl border border-transparent p-3"
    >
      <div
        data-category={expense.category.icon}
        className="expense-category flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
      >
        <CategoryIcon icon={expense.category.icon} className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-card-foreground truncate text-sm font-medium">
          {expense.description}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {translateCategoryName(expense.category.name, dict)}
        </p>
        {payer && <p className="text-muted-foreground/70 truncate text-[11px]">{payer}</p>}
      </div>
      <div className="shrink-0 text-end">
        <p className="text-card-foreground text-sm font-semibold">
          {formatCurrency(expense.amount, expense.currency, bcp47)}
        </p>
        {expense.currency !== baseCurrency && (
          <span className="bg-primary/10 text-primary mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium">
            ≈ {formatCurrency(expense.converted_amount, baseCurrency, bcp47)}
          </span>
        )}
      </div>
    </Link>
  );
}
