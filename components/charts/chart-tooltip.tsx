"use client";

import { formatCurrency } from "@/lib/currency/format";

type ChartTooltipPayloadEntry = {
  name?: string;
  value?: number | string;
  color?: string;
};

/**
 * Shared hover tooltip for every chart: value leads (bold, high-contrast),
 * series name follows (secondary) — the legend's hierarchy inverted, since
 * here the reader already has the series and wants the number.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string;
  currency: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="border-border bg-card rounded-xl border px-3 py-2 shadow-md">
      {label && <p className="text-muted-foreground text-xs">{label}</p>}
      <div className="mt-1 flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={`${entry.name}-${i}`} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="text-card-foreground ml-auto pl-3 font-semibold">
              {formatCurrency(Number(entry.value ?? 0), currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
