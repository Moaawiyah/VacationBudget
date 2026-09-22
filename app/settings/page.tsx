import { ThemeSwitcher } from "@/components/settings/theme-switcher";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getDictionary } from "@/lib/i18n/server";
import { LanguageSwitcher } from "@/components/settings/language-switcher";
import { ExportData } from "@/components/settings/export-data";
import { DeleteAccount } from "@/components/settings/delete-account";

// Account-level settings, reachable without opening a trip first — currently
// just the language switcher (see components/settings/language-switcher.tsx,
// also used from the trip-scoped settings page at app/trip/[id]/settings).
export default async function SettingsPage() {
  const dict = await getDictionary();

  return (
    <main className="safe-top safe-x safe-bottom flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          href="/trips"
          aria-label={dict.common.back}
          className="text-muted-foreground"
        >
          <ArrowLeft aria-hidden className="h-5 w-5 rtl:-scale-x-100" />
        </Link>
        <h1 className="text-foreground text-xl font-semibold">{dict.settings.title}</h1>
      </div>
      <LanguageSwitcher />
      <ThemeSwitcher />
      <ExportData />
      <DeleteAccount />
    </main>
  );
}
