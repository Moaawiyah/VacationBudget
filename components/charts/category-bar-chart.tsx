"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/currency/format";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { CategorySpend } from "@/lib/calculations/expenses";

const MAX_BARS = 8;

// Ranked bar charts can carry more items than a legend-driven chart — but
// past a reasonable count it still folds the tail into "Other" rather than
// scrolling a long list of thin bars.
function foldOther(data: CategorySpend[]) {
  if (data.length <= MAX_BARS)
    return data.map((d) => ({ name: d.name, amount: d.amount }));
  const top = data.slice(0, MAX_BARS - 1);
  const rest = data.slice(MAX_BARS - 1);
  const otherTotal = rest.reduce((sum, d) => sum + d.amount, 0);
  return [
    ...top.map((d) => ({ name: d.name, amount: d.amount })),
    { name: "Other", amount: otherTotal },
  ];
}

export function CategoryBarChart({
  data,
  currency,
}: {
  data: CategorySpend[];
  currency: string;
}) {
  if (data.length === 0) return null;

  const chartData = foldOther(data);
  const height = Math.max(120, chartData.length * 36);

  return (
    <div className="border-border bg-card rounded-3xl border p-5">
      <h2 className="text-muted-foreground text-sm font-medium">Spending by category</h2>
      <div style={{ width: "100%", height }} className="mt-3">
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ left: 0, right: 56, top: 0, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--chart-grid)" />
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={<ChartTooltip currency={currency} />}
            />
            <Bar
              dataKey="amount"
              name="Spent"
              fill="var(--chart-series-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            >
              <LabelList
                dataKey="amount"
                position="right"
                formatter={(value: string | number | boolean | null | undefined) =>
                  formatCurrency(Number(value ?? 0), currency)
                }
                style={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
