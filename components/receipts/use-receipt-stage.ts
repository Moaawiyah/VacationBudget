"use client";

import { useEffect, useState } from "react";

/** Order of the analysis stages shown while a receipt is being processed. */
export const RECEIPT_STAGES = [
  "stageUploading",
  "stageProcessing",
  "stageReading",
  "stageExtracting",
] as const;

export type ReceiptStage = (typeof RECEIPT_STAGES)[number];

const STAGE_MS = 1500;

/**
 * The stage label to show while `pending`. Analysis is one request, so this
 * can't observe each server-side step — it paces through them in the order
 * they really happen, and holds on the last until the response arrives
 * (never claiming "done" early; the review screen replaces it on success).
 */
export function useReceiptStage(pending: boolean): ReceiptStage {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(
      () => setIndex((i) => Math.min(i + 1, RECEIPT_STAGES.length - 1)),
      STAGE_MS,
    );
    return () => {
      clearInterval(timer);
      setIndex(0);
    };
  }, [pending]);

  return RECEIPT_STAGES[index];
}
