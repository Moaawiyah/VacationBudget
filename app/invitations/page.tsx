import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { InvitationList } from "@/components/invitations/invitation-list";

export default async function InvitationsPage() {
  const [{ sdk, user }, dict] = await Promise.all([requireUser(), getDictionary()]);
  const invitations = await sdk.companions.invitations(user.id);
  return (
    <main className="safe-top safe-x safe-bottom mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 sm:p-10">
      <header className="flex items-center gap-3">
        <Link
          href="/trips"
          aria-label={dict.common.back}
          className="text-primary grid size-11 place-items-center rounded-xl"
        >
          <ArrowLeft aria-hidden className="size-5 rtl:-scale-x-100" />
        </Link>
        <Mail aria-hidden className="text-primary size-6" />
        <h1 className="text-2xl font-semibold">{dict.travel.invitations}</h1>
      </header>
      <InvitationList invitations={invitations} />
    </main>
  );
}
