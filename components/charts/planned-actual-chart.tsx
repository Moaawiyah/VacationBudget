"use client";

import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ChartTooltip } from "@/components/charts/chart-tooltip";
import type { PlannedActualSpend } from "@/lib/calculations/expenses";

export function PlannedActualChart({
  data,
  currency,
}: {
  data: PlannedActualSpend[];
  currency: string;
}) {
  if (data.length === 0) return null;

  const height = Math.max(140, data.length * 44);

  return (
    <div className="border-border bg-card rounded-3xl border p-5">
      <h2 className="text-muted-foreground text-sm font-medium">Planned vs actual</h2>
      <div style={{ width: "100%", height }} className="mt-3">
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 16, top: 24, bottom: 0 }}
            barGap={2}
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
            <Legend
              verticalAlign="top"
              align="right"
              height={24}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: "var(--muted-foreground)" }}
            />
            <Bar
              dataKey="planned"
              name="Planned"
              fill="var(--chart-series-2)"
              radius={[0, 4, 4, 0]}
              maxBarSize={16}
            />
            <Bar
              dataKey="actual"
              name="Actual"
              fill="var(--chart-series-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
