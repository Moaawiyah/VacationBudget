"use client";

import { useSyncExternalStore } from "react";
import { useDictionary } from "@/components/i18n/locale-provider";
import { Sun, Moon, Monitor } from "lucide-react";

const subscribe = (callback: () => void) => {
  window.addEventListener("theme-change", callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("theme-change", callback);
    window.removeEventListener("storage", callback);
  };
};
export function ThemeSwitcher() {
  const copy = useDictionary().travel;
  const theme = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("vb-theme") ?? "system",
    () => "system",
  );
  function change(value: string) {
    localStorage.setItem("vb-theme", value);
    document.documentElement.classList.remove("light", "dark");
    if (value !== "system") document.documentElement.classList.add(value);
    window.dispatchEvent(new Event("theme-change"));
  }
  return (
    <section className="panel">
      <h2 className="mb-4 text-sm font-semibold">{copy.appearance}</h2>
      <div className="flex gap-2">
        {[
          ["light", Sun],
          ["dark", Moon],
          ["system", Monitor],
        ].map(([value, Icon]) => {
          const option = value as string;
          const Symbol = Icon as typeof Sun;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={theme === option}
              onClick={() => change(option)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm capitalize ${theme === option ? "bg-primary text-primary-foreground" : "bg-muted"}`}
            >
              <Symbol aria-hidden className="size-4" />
              {copy[option as "light" | "dark" | "system"]}
            </button>
          );
        })}
      </div>
    </section>
  );
}
