"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { deleteMyAccount } from "@/app/settings/actions";
import { Button } from "@/components/ui/button";

/** Two-step confirm — this is irreversible, so a single tap isn't enough. */
export function DeleteAccount() {
  const dict = useDictionary().settings;
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blockedTrips, setBlockedTrips] = useState<string[] | null>(null);

  function confirmDelete() {
    setError(null);
    setBlockedTrips(null);
    startTransition(async () => {
      const result = await deleteMyAccount();
      // A success redirects server-side and never returns here.
      if (result?.error) {
        setError(result.error);
        setBlockedTrips(result.trips ?? null);
      }
    });
  }

  return (
    <div className="border-danger/30 bg-danger/5 flex flex-col gap-3 rounded-3xl border p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden className="text-danger mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-foreground font-medium">{dict.deleteAccountTitle}</p>
          <p className="text-muted-foreground mt-1 text-sm">{dict.deleteAccountDescription}</p>
        </div>
      </div>

      {error && (
        <div className="text-danger text-sm">
          <p>{error}</p>
          {blockedTrips && blockedTrips.length > 0 && (
            <ul className="mt-1 list-inside list-disc">
              {blockedTrips.map((name) => (
                <li key={name}>{name}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {confirming ? (
        <div className="flex flex-col gap-2">
          <p className="text-foreground text-sm font-medium">
            {dict.deleteAccountConfirmPrompt}
          </p>
          <div className="flex gap-2">
            <Button variant="danger" loading={isPending} onClick={confirmDelete}>
              {dict.deleteAccountConfirmButton}
            </Button>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              {dict.deleteAccountCancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="danger" onClick={() => setConfirming(true)}>
          {dict.deleteAccountButton}
        </Button>
      )}
    </div>
  );
}
