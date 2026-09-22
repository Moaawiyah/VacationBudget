"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { CopilotPanel } from "./copilot-panel";

/**
 * The Copilot as a navigation entry — the mobile bottom-nav tab and the
 * desktop sidebar item. A button, not a link: it opens the same panel as
 * the dashboard's "Ask AI", over whichever trip page is showing.
 */
export function CopilotNavButton({ tripId, variant }: { tripId: string; variant: "tab" | "sidebar" }) {
  const dict = useDictionary().ai;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          variant === "tab"
            ? "flex flex-col items-center gap-1 justify-self-center rounded-xl px-2 py-1.5 text-xs font-medium"
            : "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-white/5",
          open ? "text-accent" : variant === "tab" ? "text-slate-400" : "text-nav-foreground",
        )}
      >
        <Sparkles aria-hidden className={variant === "tab" ? "h-5 w-5" : "size-4"} />
        {dict.copilotNavLabel}
      </button>
      {open && <CopilotPanel tripId={tripId} onClose={() => setOpen(false)} />}
    </>
  );
}
