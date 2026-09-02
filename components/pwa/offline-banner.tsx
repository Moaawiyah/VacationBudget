"use client";

import { useOffline } from "next/offline";
import { WifiOff } from "lucide-react";

// Relies on next.config.ts's experimental.useOffline — see the comment
// there. Pending Server Actions (e.g. saving an expense) keep retrying
// automatically while this banner is up; nothing is lost, just delayed.
export function OfflineBanner() {
  const isOffline = useOffline();

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="safe-top safe-x bg-foreground text-background flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium"
    >
      <WifiOff className="h-3.5 w-3.5" />
      You&apos;re offline — changes will save once you&apos;re back online.
    </div>
  );
}
