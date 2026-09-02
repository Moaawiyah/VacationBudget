"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { DailySpend } from "@/lib/calculations/expenses";

function shortDateLabel(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(
    date,
  );
}

export function DailyBarChart({
  data,
  currency,
}: {
  data: DailySpend[];
  currency: string;
}) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    amount: d.amount,
    label: shortDateLabel(d.date),
  }));
  // A fixed minimum width per bar so long trips scroll horizontally instead
  // of squeezing every bar down to an unreadable sliver.
  const minWidth = Math.max(280, chartData.length * 44);

  return (
    <div className="border-border bg-card rounded-3xl border p-5">
      <h2 className="text-muted-foreground text-sm font-medium">Spending by day</h2>
      <div className="mt-3 overflow-x-auto">
        <div style={{ width: minWidth, height: 160 }}>
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                content={<ChartTooltip currency={currency} />}
              />
              <Bar
                dataKey="amount"
                name="Spent"
                fill="var(--chart-series-1)"
                radius={[4, 4, 0, 0]}
                maxBarSize={24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
