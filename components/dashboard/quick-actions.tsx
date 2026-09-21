import Link from "next/link";
import { Plus, ScanLine, ChartNoAxesCombined, Wallet } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";

export async function QuickActions({ tripId }: { tripId: string }) {
  const dict = await getDictionary();
  const base = `/trip/${tripId}`;
  const actions = [
    ["/expenses/new", dict.expenses.addExpense, Plus],
    ["/expenses/receipt", dict.receipts.scanReceipt, ScanLine],
    ["/analytics", dict.travel.analytics, ChartNoAxesCombined],
    ["/plan", dict.nav.plan, Wallet],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map(([href, title, Icon]) => (
        <Link
          key={href}
          href={base + href}
          className="quick-action flex items-center gap-3 rounded-2xl border p-4 text-xs font-medium"
        >
          <span className="quick-action-icon rounded-xl p-2.5">
            <Icon aria-hidden className="size-5" />
          </span>
          {title}
        </Link>
      ))}
    </div>
  );
}
