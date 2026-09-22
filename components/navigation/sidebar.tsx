"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Mountain,
  LayoutDashboard,
  Map,
  Receipt,
  ScanLine,
  ChartNoAxesCombined,
  Settings,
  Wallet,
  Users,
  Mail,
  Scale,
} from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";

export function Sidebar({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const dict = useDictionary();
  const base = `/trip/${tripId}`;
  const links = [
    [base + "/dashboard", dict.nav.dashboard, LayoutDashboard],
    ["/trips", dict.trips.title, Map],
    [base + "/expenses", dict.nav.expenses, Receipt],
    [base + "/expenses/receipt", dict.receipts.scanReceipt, ScanLine],
    [base + "/analytics", dict.travel.analytics, ChartNoAxesCombined],
    [base + "/companions", dict.travel.companions, Users],
    [base + "/balances", dict.balances.title, Scale],
    ["/invitations", dict.travel.invitations, Mail],
    [base + "/plan", dict.nav.plan, Wallet],
    [base + "/settings", dict.nav.settings, Settings],
  ] as const;
  return (
    <aside className="bg-nav-background fixed inset-y-0 start-0 z-30 hidden w-60 flex-col p-5 text-white lg:flex">
      <Link href="/trips" className="mt-5 mb-10 flex items-center gap-2.5">
        <Mountain aria-hidden className="text-accent size-8" />
        <div>
          <span className="text-base font-bold tracking-tight">VacationBudget</span>
          <p className="mt-1 text-[10px] text-slate-400">{dict.travel.tagline}</p>
        </div>
      </Link>
      <nav aria-label={dict.travel.navigation} className="space-y-1.5">
        {links.map(([href, label, Icon]) => (
          <Link
            key={href}
            href={href}
            aria-current={
              pathname === href || (href === "/trips" && pathname === `${base}/details`)
                ? "page"
                : undefined
            }
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm",
              pathname === href || (href === "/trips" && pathname === `${base}/details`)
                ? "bg-nav-active text-white"
                : "text-nav-foreground hover:bg-white/5",
            )}
          >
            <Icon aria-hidden className="size-4" />
            {label}
          </Link>
        ))}
      </nav>
      <Link href="/trips/new" className="travel-cover mt-auto rounded-2xl p-4 pt-10">
        <Mountain aria-hidden className="text-accent mb-3 size-5" />
        <p className="text-sm font-semibold">{dict.travel.nextAdventure}</p>
        <span className="mt-3 inline-block text-xs text-white/80">
          {dict.travel.planTrip}
        </span>
      </Link>
    </aside>
  );
}
