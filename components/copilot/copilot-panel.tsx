"use client";

import { useRef, useState, useTransition } from "react";
import { Send, Sparkles, X } from "lucide-react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { askCopilot } from "@/app/trip/[id]/copilot/actions";
import type { CopilotTurn } from "@/lib/ai/copilot/orchestrate";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

type Message = CopilotTurn & { error?: boolean; toolsUsed?: string[] };

/**
 * The chat surface itself — full-screen on mobile, a floating panel on
 * desktop. Conversation lives only in this component's state: nothing is
 * persisted, and every send is its own read-only askCopilot call (see that
 * action and lib/ai/copilot/orchestrate.ts for why it can't write anything).
 */
export function CopilotPanel({ tripId, onClose }: { tripId: string; onClose: () => void }) {
  const dict = useDictionary().ai;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  function send() {
    const text = input.trim();
    if (!text || isPending) return;
    const history: CopilotTurn[] = messages.map(({ role, content }) => ({ role, content }));
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    startTransition(async () => {
      let reply: Message;
      try {
        const result = await askCopilot(tripId, { history, message: text });
        reply =
          "error" in result
            ? { role: "assistant", content: result.error, error: true }
            : { role: "assistant", content: result.reply, toolsUsed: result.toolsUsed };
      } catch {
        // The action itself never reached the server (or its response never came back).
        const content = navigator.onLine ? dict.copilotErrorGeneric : dict.copilotOffline;
        reply = { role: "assistant", content, error: true };
      }
      setMessages((prev) => [...prev, reply]);
      requestAnimationFrame(() => listRef.current?.scrollTo(0, listRef.current.scrollHeight));
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={dict.copilotTitle}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        className="bg-background flex h-[85vh] w-full flex-col rounded-t-3xl sm:h-[70vh] sm:max-w-md sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-border flex items-center justify-between border-b p-4">
          <p className="flex items-center gap-2 font-semibold">
            <Sparkles aria-hidden className="text-primary size-4 shrink-0" />
            {dict.copilotTitle}
          </p>
          <button type="button" onClick={onClose} aria-label={dict.copilotClose} className="text-muted-foreground">
            <X aria-hidden className="size-5" />
          </button>
        </header>

        <div ref={listRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-muted-foreground text-sm">{dict.copilotEmptyState}</p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-line",
                m.role === "user"
                  ? "bg-primary text-primary-foreground self-end"
                  : m.error
                    ? "bg-danger/10 text-danger self-start"
                    : "bg-card text-card-foreground self-start",
              )}
            >
              {m.content}
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <p className="text-muted-foreground mt-1.5 text-xs">
                  {interpolate(dict.copilotCheckedData, {
                    tools: m.toolsUsed
                      .map((t) => dict.copilotTools[t as keyof typeof dict.copilotTools] ?? t)
                      .join(", "),
                  })}
                </p>
              )}
            </div>
          ))}
          {isPending && (
            <p className="text-muted-foreground self-start text-sm">{dict.copilotThinking}</p>
          )}
        </div>

        <div className="border-border flex gap-2 border-t p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
            autoFocus
            placeholder={dict.copilotPlaceholder}
            className="border-border bg-card h-11 flex-1 rounded-full border px-4 text-sm outline-none"
          />
          <button
            type="button"
            onClick={send}
            disabled={isPending || !input.trim()}
            aria-label={dict.copilotSend}
            className="bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-full disabled:opacity-50"
          >
            <Send aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
