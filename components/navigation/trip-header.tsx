"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function TripHeader({
  tripId,
  name,
  destination,
}: {
  tripId: string;
  name: string;
  destination: string;
}) {
  const pathname = usePathname().replace(/\/$/, "");
  const dict = useDictionary();
  const base = `/trip/${tripId}`;
  const isDashboard = pathname === `${base}/dashboard`;
  const isExpenseDetail = pathname.startsWith(`${base}/expenses/`);
  const href = isDashboard
    ? "/trips"
    : isExpenseDetail
      ? `${base}/expenses`
      : `${base}/dashboard`;
  const label = isDashboard
    ? dict.trips.title
    : isExpenseDetail
      ? dict.nav.expenses
      : dict.nav.dashboard;

  return (
    <header
      className={cn(
        "safe-top safe-x border-border bg-background/95 sticky top-0 z-10 border-b backdrop-blur-md",
        isDashboard && "lg:hidden",
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-4 px-4 py-2 sm:px-8">
        <Link
          href={href}
          aria-label={`${dict.common.back}: ${label}`}
          className="text-primary hover:bg-primary/10 flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-2 text-sm font-medium"
        >
          <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" />
          <span>{dict.common.back}</span>
        </Link>
        <div className="border-border min-w-0 border-s ps-4">
          <p className="truncate text-sm font-semibold">{name}</p>
          <p className="text-muted-foreground truncate text-xs">{destination}</p>
        </div>
      </div>
    </header>
  );
}
