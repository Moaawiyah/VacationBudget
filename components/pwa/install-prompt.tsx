"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const DISMISS_KEY = "vacation-budget:install-prompt-dismissed";

// iOS Safari has no native install banner (unlike Chrome/Android), so the
// standard approach — recommended in Next.js's own PWA guide — is a custom
// instructional prompt shown only to iOS users who haven't installed yet.
export function InstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    const dismissed = window.localStorage.getItem(DISMISS_KEY) === "1";
    // Deliberate: this reads browser-only globals (userAgent, matchMedia,
    // localStorage) unavailable during SSR. Rendering `false` on the server
    // pass and flipping visible post-hydration is the correct, standard
    // pattern here — there's no SSR-available value to derive this from.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisible(isIOS && !isStandalone && !dismissed);
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="safe-x border-border bg-muted text-muted-foreground flex items-center gap-3 border-b px-4 py-2.5 text-xs">
      <p className="flex-1">
        Install Vacation Budget: tap <span className="font-medium">Share</span> then{" "}
        <span className="font-medium">Add to Home Screen</span>.
      </p>
      <button type="button" onClick={dismiss} aria-label="Dismiss" className="shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
