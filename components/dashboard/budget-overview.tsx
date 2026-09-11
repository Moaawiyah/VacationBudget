import {
  CalendarDays,
  ClipboardList,
  CreditCard,
  Gauge,
  PiggyBank,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { Trip } from "@/types/trip";
import {
  calculateRemainingBudget,
  calculateRemainingDays,
  calculateDailyBudget,
} from "@/lib/calculations/trip";
import { formatCurrency } from "@/lib/currency/format";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { LOCALE_BCP47 } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatCard } from "@/components/ui/stat-card";

export async function BudgetOverview({
  trip,
  totalSpent,
  totalPlanned,
}: {
  trip: Trip;
  totalSpent: number;
  totalPlanned: number;
}) {
  const [dict, locale] = await Promise.all([getDictionary(), getLocale()]);
  const bcp47 = LOCALE_BCP47[locale];
  const d = dict.dashboard;
  const remaining = calculateRemainingBudget(trip.total_budget, totalSpent);
  const remainingDays = calculateRemainingDays(trip.end_date);
  const dailySafe = calculateDailyBudget(remaining, remainingDays);
  const percentUsed = trip.total_budget > 0 ? (totalSpent / trip.total_budget) * 100 : 0;
  const isOverBudget = remaining < 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="border-border bg-card rounded-3xl border p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Gauge aria-hidden className="h-4 w-4 shrink-0" />
            {d.budgetUsed}
          </p>
          <p className="text-muted-foreground text-sm font-medium">
            {interpolate(d.percentUsed, { n: Math.round(percentUsed) })}
          </p>
        </div>
        <ProgressBar value={percentUsed} className="mt-3" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label={d.budget}
          icon={Wallet}
          value={formatCurrency(trip.total_budget, trip.base_currency, bcp47)}
        />
        <StatCard
          label={d.spent}
          icon={CreditCard}
          value={formatCurrency(totalSpent, trip.base_currency, bcp47)}
        />
        <StatCard
          label={d.remaining}
          icon={PiggyBank}
          value={formatCurrency(remaining, trip.base_currency, bcp47)}
          tone={isOverBudget ? "danger" : "success"}
        />
        <StatCard
          label={d.planned}
          icon={ClipboardList}
          value={formatCurrency(totalPlanned, trip.base_currency, bcp47)}
        />
        <StatCard
          label={d.remainingDays}
          icon={CalendarDays}
          value={String(remainingDays)}
          sublabel={remainingDays === 1 ? d.dayLeft : d.daysLeft}
        />
        <StatCard
          label={d.safeDailyBudget}
          icon={ShieldCheck}
          value={interpolate(d.perDay, {
            amount: formatCurrency(dailySafe, trip.base_currency, bcp47),
          })}
          tone={dailySafe < 0 ? "danger" : "default"}
        />
      </div>
    </div>
  );
}
