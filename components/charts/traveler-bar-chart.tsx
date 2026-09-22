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
import { useDictionary } from "@/components/i18n/locale-provider";
import type { Balance } from "@/lib/finance/balances";
import { companionDisplayName, type Companion } from "@/types/companion";

/** Who paid for what, next to what their own share actually was — deterministic, from calculateBalances, never estimated. */
export function TravelerBarChart({
  balances,
  companions,
  currency,
}: {
  balances: Balance[];
  companions: Map<string, Companion>;
  currency: string;
}) {
  const dict = useDictionary();
  if (balances.length < 2) return null;

  const data = balances.map((b) => {
    const person = companions.get(b.userId);
    return {
      name: person ? companionDisplayName(person) : b.userId,
      paid: b.totalPaid,
      share: b.totalShare,
    };
  });
  const height = Math.max(140, data.length * 48);

  return (
    <div className="border-border bg-card rounded-3xl border p-5">
      <h2 className="text-muted-foreground text-sm font-medium">
        {dict.dashboard.travelerChartTitle}
      </h2>
      <div style={{ width: "100%", height }} className="mt-3">
        <ResponsiveContainer>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 0, right: 24, top: 0, bottom: 0 }}
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
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="paid"
              name={dict.dashboard.paidSeries}
              fill="var(--chart-series-1)"
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
            />
            <Bar
              dataKey="share"
              name={dict.dashboard.personalShareSeries}
              fill="var(--chart-series-2)"
              radius={[0, 4, 4, 0]}
              maxBarSize={18}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
