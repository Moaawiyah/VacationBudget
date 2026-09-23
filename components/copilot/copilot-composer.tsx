"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/types";

const MAX_LENGTH = 500; // the Server Action's own limit

/**
 * The question box. Text is 16px on purpose: iOS Safari zooms the whole
 * page when an input under 16px gets focus — the "screen gets bigger when
 * the Copilot opens" bug. It's focused automatically only where there's a
 * real pointer (desktop); on touch devices opening the panel no longer pops
 * the keyboard up and shrinks the screen. Enter sends; Shift+Enter is a new line.
 */
export function CopilotComposer({
  dict,
  disabled,
  onSend,
}: {
  dict: Dictionary["ai"];
  disabled: boolean;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) ref.current?.focus({ preventScroll: true });
  }, []);

  // Grow with the text up to ~5 lines, then scroll inside the box.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  function submit() {
    if (disabled || !text.trim()) return;
    onSend(text);
    setText("");
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="border-border bg-background flex items-end gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <textarea
        ref={ref}
        rows={1}
        value={text}
        maxLength={MAX_LENGTH}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={dict.copilotPlaceholder}
        aria-label={dict.copilotPlaceholder}
        className="border-border bg-card focus:border-primary/60 max-h-33 min-h-11 flex-1 resize-none rounded-3xl border px-4 py-2.5 text-base leading-6 outline-none"
      />
      <button
        type="submit"
        disabled={disabled || !text.trim()}
        aria-label={dict.copilotSend}
        className="bg-primary text-primary-foreground grid size-11 shrink-0 place-items-center rounded-full transition-opacity disabled:opacity-40"
      >
        <ArrowUp aria-hidden className="size-5" />
      </button>
    </form>
  );
}
