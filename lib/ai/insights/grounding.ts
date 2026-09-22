import type { SpendingSignal } from "./signals";

// Arabic-Indic (٠-٩) and Extended Arabic-Indic (۰-۹) digits, plus the Arabic
// decimal/thousands separators — an Arabic reply may use any of them.
function toAsciiDigits(text: string): string {
  return text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",");
}

/** Every number written in `text`, with thousands separators removed. */
export function numbersIn(text: string): number[] {
  const matches = toAsciiDigits(text).match(/\d[\d,]*(?:\.\d+)?/g) ?? [];
  return matches.map((m) => Number(m.replace(/,/g, ""))).filter(Number.isFinite);
}

function factNumbers(signal: SpendingSignal): number[] {
  return Object.values(signal)
    .filter((v): v is number => typeof v === "number")
    .map(Math.abs);
}

/**
 * The deterministic guard on the model's prose: every number the sentence
 * quotes must be one of the signal's own facts — exactly, or that fact
 * rounded to a whole unit ("about €310" for 310.47 is fine; "5.2" is not
 * "about 5", it's a new number). A sentence that invents a
 * percentage, a total or a per-day figure the code never computed fails
 * here and is discarded rather than shown.
 */
export function isGrounded(text: string, signal: SpendingSignal): boolean {
  const facts = factNumbers(signal);
  return numbersIn(text).every((n) => facts.some((f) => Math.abs(n - f) < 0.005 || n === Math.round(f)));
}
