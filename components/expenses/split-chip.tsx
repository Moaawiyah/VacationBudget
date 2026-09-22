"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labeled row wrapper, matching the form's other field groups. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
      {children}
    </div>
  );
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

/** A pill-shaped toggle button — the same selected/unselected language CategoryPicker uses. */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background text-muted-foreground",
      )}
    >
      {children}
    </button>
  );
}
