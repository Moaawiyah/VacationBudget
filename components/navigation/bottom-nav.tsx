"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Plus, ClipboardList, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const base = `/trip/${tripId}`;

  const tabs = [
    { href: `${base}/dashboard`, label: "Dashboard", icon: LayoutDashboard },
    { href: `${base}/expenses`, label: "Expenses", icon: Receipt },
    { href: `${base}/plan`, label: "Plan", icon: ClipboardList },
    { href: `${base}/settings`, label: "Settings", icon: Settings },
  ];

  return (
    <nav className="safe-bottom safe-x border-border bg-card fixed inset-x-0 bottom-0 z-20 border-t">
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 py-2">
        {tabs.slice(0, 2).map((tab) => (
          <NavItem key={tab.href} {...tab} active={pathname === tab.href} />
        ))}

        <Link
          href={`${base}/expenses/new`}
          className="bg-primary text-primary-foreground -mt-6 flex h-14 w-14 items-center justify-center justify-self-center rounded-full shadow-lg active:opacity-90"
        >
          <Plus className="h-6 w-6" />
        </Link>

        {tabs.slice(2).map((tab) => (
          <NavItem key={tab.href} {...tab} active={pathname === tab.href} />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col items-center gap-1 justify-self-center rounded-xl px-2 py-1.5 text-xs font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
