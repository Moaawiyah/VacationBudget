"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, Sparkles, X } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { CopilotComposer } from "./copilot-composer";
import { CopilotMessages } from "./copilot-messages";
import { resetConversation, sendMessage, useConversation } from "./copilot-store";
import { useBodyScrollLock } from "./use-body-scroll-lock";

/**
 * The Copilot surface: full-screen on phones, a drawer on the right on
 * larger screens. Rendered into <body> through a portal, so no parent
 * (the bottom nav, the sidebar) can clip or reposition it, and the page
 * behind it is locked so it can't scroll or jump while it's open. The
 * conversation lives in copilot-store.ts, so it survives closing the panel.
 */
export function CopilotPanel({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const dict = useDictionary().ai;
  const conversation = useConversation(tripId);
  useBodyScrollLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = (text: string) =>
    void sendMessage(tripId, text, { generic: dict.copilotErrorGeneric, offline: dict.copilotOffline });

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div aria-hidden className="copilot-backdrop absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict.copilotTitle}
        className="copilot-sheet bg-background relative flex h-dvh w-full flex-col pt-[env(safe-area-inset-top)] sm:m-3 sm:h-[calc(100dvh-1.5rem)] sm:max-w-[26rem] sm:rounded-3xl sm:pt-0 sm:shadow-2xl"
      >
        <header className="border-border flex items-center gap-3 border-b px-4 py-3">
          <span className="bg-primary text-primary-foreground grid size-9 shrink-0 place-items-center rounded-xl">
            <Sparkles aria-hidden className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{dict.copilotTitle}</p>
            <p className="text-muted-foreground truncate text-xs">{dict.copilotSubtitle}</p>
          </div>
          {conversation.messages.length > 0 && (
            <button
              type="button"
              onClick={() => resetConversation(tripId)}
              disabled={conversation.pending}
              aria-label={dict.copilotNewChat}
              title={dict.copilotNewChat}
              className="text-muted-foreground hover:bg-muted grid size-9 place-items-center rounded-full disabled:opacity-40"
            >
              <RotateCcw aria-hidden className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.copilotClose}
            className="text-muted-foreground hover:bg-muted grid size-9 place-items-center rounded-full"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <CopilotMessages conversation={conversation} dict={dict} onSuggestion={send} />
        <CopilotComposer dict={dict} disabled={conversation.pending} onSend={send} />
      </div>
    </div>,
    document.body,
  );
}
