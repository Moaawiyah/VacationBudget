"use client";

import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";
import type { Conversation } from "./copilot-store";

type AiDict = Dictionary["ai"];

/** The scrolling conversation: suggestions when empty, bubbles, and a typing indicator while waiting. */
export function CopilotMessages({
  conversation,
  dict,
  onSuggestion,
}: {
  conversation: Conversation;
  dict: AiDict;
  onSuggestion: (text: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const { messages, pending } = conversation;

  // Keep the newest message in view. Sets this list's own scrollTop rather
  // than scrollIntoView, which would also scroll the (locked) page behind.
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, pending]);

  if (messages.length === 0 && !pending) {
    const suggestions = [
      dict.copilotSuggestionPace,
      dict.copilotSuggestionOverspend,
      dict.copilotSuggestionOwe,
      dict.copilotSuggestionFood,
    ];
    return (
      <div className="flex flex-1 flex-col justify-end gap-4 overflow-y-auto overscroll-contain p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="bg-primary/10 text-primary grid size-12 place-items-center rounded-2xl">
            <Sparkles aria-hidden className="size-6" />
          </span>
          <p className="font-semibold">{dict.copilotEmptyTitle}</p>
          <p className="text-muted-foreground max-w-xs text-sm">{dict.copilotEmptyState}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions.map((text) => (
            <button
              key={text}
              type="button"
              onClick={() => onSuggestion(text)}
              className="border-border bg-card hover:border-primary/40 hover:bg-primary/5 rounded-2xl border px-3.5 py-3 text-start text-sm transition-colors"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      role="log"
      aria-live="polite"
      className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain p-4"
    >
      {messages.map((m) =>
        m.role === "user" ? (
          <p
            key={m.id}
            className="bg-primary text-primary-foreground max-w-[85%] self-end rounded-2xl rounded-ee-md px-3.5 py-2.5 text-sm whitespace-pre-line"
          >
            {m.content}
          </p>
        ) : (
          <div key={m.id} className="flex max-w-[92%] items-start gap-2 self-start">
            <span className="bg-primary/10 text-primary mt-0.5 grid size-7 shrink-0 place-items-center rounded-full">
              <Sparkles aria-hidden className="size-3.5" />
            </span>
            <div
              className={cn(
                "rounded-2xl rounded-ss-md px-3.5 py-2.5 text-sm whitespace-pre-line",
                m.error ? "bg-danger/10 text-danger" : "bg-card text-card-foreground border-border border",
              )}
            >
              {m.content}
              {m.toolsUsed && m.toolsUsed.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {m.toolsUsed.map((t) => (
                    <span key={t} className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]">
                      {dict.copilotTools[t as keyof AiDict["copilotTools"]] ?? t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      )}
      {pending && (
        <div className="flex items-center gap-2 self-start" aria-label={dict.copilotThinking}>
          <span className="bg-primary/10 text-primary grid size-7 place-items-center rounded-full">
            <Sparkles aria-hidden className="size-3.5" />
          </span>
          <span className="bg-card border-border flex gap-1 rounded-2xl border px-3.5 py-3">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="copilot-dot bg-muted-foreground/60 size-1.5 rounded-full"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
