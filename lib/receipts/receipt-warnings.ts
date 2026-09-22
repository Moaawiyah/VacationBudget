import type { Dictionary } from "@/lib/i18n/types";
import type { ReceiptWarning } from "@/types/receipt";

type WarningCopy = Dictionary["receipts"]["warnings"];

/**
 * The review screen's warnings, translated and de-duplicated (the model can
 * flag several fields as uncertain; the user needs to read that once).
 *
 * Warnings are translated by `code`, never shown via `message` — that's
 * English developer detail, and printing it is how raw strings like
 * "llm_unavailable" once reached users. A code this build doesn't know
 * (receipt-service deployed ahead of the web app) gets the generic
 * double-check text rather than the raw code.
 */
export function warningMessages(warnings: ReceiptWarning[], t: WarningCopy): string[] {
  const known = t as Record<string, string>;
  const messages = warnings.map((w) => known[w.code] ?? t.low_confidence);
  return [...new Set(messages)];
}
