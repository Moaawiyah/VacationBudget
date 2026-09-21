"use client";

import { useState, useTransition } from "react";
import { Check, X, Mail } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { interpolate } from "@/lib/i18n/interpolate";
import type { TripInvitation } from "@/types/companion";
import { respondToInvitation } from "@/app/invitations/actions";

export function InvitationList({ invitations }: { invitations: TripInvitation[] }) {
  const dict = useDictionary();
  const [items, setItems] = useState(invitations);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function respond(tripId: string, accept: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await respondToInvitation(tripId, accept);
      if (result.error) setError(result.error);
      else setItems((current) => current.filter((item) => item.tripId !== tripId));
    });
  }

  if (!items.length)
    return (
      <div className="panel text-muted-foreground py-12 text-center">
        <Mail aria-hidden className="mx-auto mb-3 size-8" />
        <p>{dict.travel.noInvitations}</p>
      </div>
    );
  return (
    <div className="space-y-3" aria-busy={pending}>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      {items.map((invitation) => (
        <article key={invitation.tripId} className="panel flex items-center gap-4">
          <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-full">
            <Mail aria-hidden className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">{invitation.tripName}</h2>
            <p className="text-muted-foreground mt-1 text-xs">
              {interpolate(dict.travel.invitedBy, {
                username: invitation.inviterUsername,
              })}
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(invitation.tripId, false)}
            aria-label={dict.travel.ignore}
            className="text-muted-foreground hover:bg-danger/10 hover:text-danger grid size-10 place-items-center rounded-full"
          >
            <X aria-hidden className="size-5" />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => respond(invitation.tripId, true)}
            aria-label={dict.travel.accept}
            className="bg-primary text-primary-foreground grid size-10 place-items-center rounded-full"
          >
            <Check aria-hidden className="size-5" />
          </button>
        </article>
      ))}
    </div>
  );
}
