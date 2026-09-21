"use client";

import type { CategorySpend } from "@/lib/calculations/expenses";
import { useDictionary, useLocale } from "@/components/i18n/locale-provider";
import { formatCurrency } from "@/lib/currency/format";

const colors = [
  "#4c91ff",
  "#00c9a7",
  "#ffcf4d",
  "#55cdb0",
  "#ff8877",
  "#b18dff",
  "#8797aa",
];
export function CategoryChart({
  data,
  currency,
}: {
  data: CategorySpend[];
  currency: string;
}) {
  const dict = useDictionary();
  const { bcp47 } = useLocale();
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  const gradient = data
    .map((item, i) => {
      const start =
        total > 0
          ? (data.slice(0, i).reduce((sum, d) => sum + d.amount, 0) / total) * 100
          : 0;
      const cursor = start + (total > 0 ? (item.amount / total) * 100 : 0);
      return `${colors[i % colors.length]} ${start}% ${cursor}%`;
    })
    .join(",");
  return (
    <section className="panel h-full">
      <h2 className="text-sm font-semibold">{dict.dashboard.categoryChartTitle}</h2>
      {total <= 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {dict.expenses.noExpensesTitle}
        </p>
      ) : (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
          <div
            aria-hidden
            className="grid size-40 shrink-0 place-items-center rounded-full"
            style={{ background: `conic-gradient(${gradient})` }}
          >
            <div className="bg-card flex size-28 flex-col items-center justify-center rounded-full">
              <span className="text-lg font-semibold">
                {formatCurrency(total, currency, bcp47)}
              </span>
              <span className="text-muted-foreground text-xs">
                {dict.dashboard.spent}
              </span>
            </div>
          </div>
          <ul className="min-w-40 flex-1 space-y-3">
            {data.map((item, i) => (
              <li key={item.categoryId} className="flex items-center gap-2 text-xs">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: colors[i % colors.length] }}
                />
                <span className="flex-1">{item.name}</span>
                <span className="font-medium">
                  {formatCurrency(item.amount, currency, bcp47)}
                </span>
                <span className="text-muted-foreground w-8 text-end">
                  {Math.round((item.amount / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
