import Link from "next/link";
import { CalendarDays, Pencil, Receipt, ScanLine, Wallet, Users, Scale } from "lucide-react";
import type { Trip } from "@/types/trip";
import type { ExpenseWithCategory } from "@/types/expense";
import type { Dictionary } from "@/lib/i18n/types";
import { TripDetailsOverview } from "./trip-details-overview";
import { formatDateRange } from "@/lib/format-date";
import { calculateTripDays } from "@/lib/calculations/trip";
import { ExpenseRow } from "@/components/expenses/expense-row";
import type { Companion } from "@/types/companion";
import { cn } from "@/lib/utils";

export function TripDetailsView({
  trip,
  expenses,
  dict,
  bcp47,
  companions,
  isOwner,
}: {
  trip: Trip;
  expenses: ExpenseWithCategory[];
  dict: Dictionary;
  bcp47: string;
  companions: Companion[];
  isOwner: boolean;
}) {
  const base = `/trip/${trip.id}`;
  const spent = expenses.reduce((total, expense) => total + expense.converted_amount, 0);
  const recent = [...expenses]
    .sort((a, b) => b.expense_date.localeCompare(a.expense_date))
    .slice(0, 4);
  const actions = [
    ...(isOwner ? [[`/trips/${trip.id}/edit`, dict.common.edit, Pencil] as const] : []),
    [`${base}/companions`, dict.travel.companions, Users],
    [`${base}/balances`, dict.balances.title, Scale],
    [`${base}/plan`, dict.dashboard.budget, Wallet],
    [`${base}/expenses`, dict.expenses.title, Receipt],
    [`${base}/expenses/receipt`, dict.receipts.scanReceipt, ScanLine],
  ] as const;
  return (
    <main className="p-4 sm:p-8">
      <div aria-hidden className="travel-cover h-52 rounded-t-3xl sm:h-72" />
      <section className="bg-card border-border relative -mt-6 rounded-3xl border p-5 shadow-sm sm:p-8">
        <p className="text-primary text-xs font-semibold tracking-widest uppercase">
          {dict.travel.tripDetails}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {trip.name}
        </h1>
        <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-2 text-sm">
          <CalendarDays aria-hidden className="size-4" />
          {formatDateRange(trip.start_date, trip.end_date, bcp47)}
          <span>
            · {calculateTripDays(trip.start_date, trip.end_date)} {dict.dashboard.days}
          </span>
        </p>
        {trip.description && (
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-relaxed">
            {trip.description}
          </p>
        )}
        <nav
          aria-label={dict.travel.tripDetails}
          className="border-border mt-6 grid grid-cols-4 gap-2 border-b pb-6 sm:max-w-xl"
        >
          {actions.map(([href, label, Icon]) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 text-center text-xs"
            >
              <span className="bg-muted hover:bg-primary/15 text-primary grid size-11 place-items-center rounded-full">
                <Icon aria-hidden className="size-4" />
              </span>
              {label}
            </Link>
          ))}
        </nav>
        <TripDetailsOverview trip={trip} spent={spent} dict={dict} bcp47={bcp47} />
        <section className="border-border mt-8 border-t pt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{dict.travel.companions}</h2>
            <Link
              href={`${base}/companions`}
              className="text-primary text-sm font-medium"
            >
              {isOwner ? dict.common.edit : dict.travel.viewAll}
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-3">
            {companions.map((person) => (
              <li
                key={person.userId}
                className={cn(
                  "border-border bg-background flex items-center gap-2 rounded-full border py-2 ps-2 pe-4 text-sm",
                  person.status === "pending" && "opacity-40",
                )}
              >
                <span className="bg-primary/10 text-primary grid size-8 place-items-center rounded-full font-semibold">
                  {(person.firstName || person.username).slice(0, 1).toUpperCase()}
                </span>
                <span>@{person.username || person.firstName}</span>
                {person.status === "pending" && (
                  <span className="text-muted-foreground text-xs">
                    {dict.travel.pending}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section className="border-border mt-8 border-t pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              {dict.expenses.title}{" "}
              <span className="text-muted-foreground text-sm">({expenses.length})</span>
            </h2>
            <Link
              href={`${base}/expenses/new`}
              className="text-primary text-sm font-medium"
            >
              + {dict.expenses.addExpense}
            </Link>
          </div>
          {recent.length ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {recent.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  tripId={trip.id}
                  baseCurrency={trip.base_currency}
                  dict={dict}
                  bcp47={bcp47}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground py-5 text-sm">
              {dict.expenses.noExpensesTitle}
            </p>
          )}
          <Link
            href={`${base}/expenses`}
            className="text-primary mt-4 inline-block text-sm"
          >
            {dict.travel.viewAll}
          </Link>
        </section>
      </section>
    </main>
  );
}
