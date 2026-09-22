"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { CopilotPanel } from "./copilot-panel";

/**
 * Entry point for the Trip Finance Copilot — the dashboard-level "✨ Ask AI"
 * trigger, or (variant "link") the smaller follow-up inside the insight card.
 */
export function AskAiButton({ tripId, variant = "block" }: { tripId: string; variant?: "block" | "link" }) {
  const dict = useDictionary().ai;
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "text-primary flex items-center gap-2 text-sm font-semibold",
          variant === "block"
            ? "border-primary/40 justify-center rounded-2xl border border-dashed py-3"
            : "self-start",
        )}
      >
        <Sparkles aria-hidden className="size-4 shrink-0" />
        {dict.askAi}
      </button>
      {open && <CopilotPanel tripId={tripId} onClose={() => setOpen(false)} />}
    </>
  );
}
