import type { Dictionary } from "@/lib/i18n/types";

/**
 * Why a receipt couldn't be analyzed, as the browser sees it. receipt-service
 * reports its own codes ({ code, message }); those a user can act on pass
 * through, and everything else (bad request, auth, internal) is "unknown" —
 * logged server-side, but not something a user can fix.
 */
export const RECEIPT_ERROR_CODES = [
  "unsupported_image",
  "image_too_large",
  "receipt_unreadable",
  "analysis_unavailable",
  "rate_limited",
  "not_found",
  "unknown",
] as const;

export type ReceiptErrorCode = (typeof RECEIPT_ERROR_CODES)[number];

const STATUS_BY_CODE: Record<ReceiptErrorCode, number> = {
  unsupported_image: 400,
  image_too_large: 413,
  receipt_unreadable: 422,
  analysis_unavailable: 503,
  rate_limited: 429,
  not_found: 404,
  unknown: 502,
};

export function isReceiptErrorCode(value: unknown): value is ReceiptErrorCode {
  return (RECEIPT_ERROR_CODES as readonly unknown[]).includes(value);
}

/** The code from an error body, else a best guess from the HTTP status. */
export function receiptErrorCode(status: number, body: unknown): ReceiptErrorCode {
  const code = body && typeof body === "object" && "code" in body ? body.code : null;
  if (isReceiptErrorCode(code)) return code;
  if (status === 429) return "rate_limited";
  if (status === 413) return "image_too_large";
  if (status === 503) return "analysis_unavailable";
  return "unknown";
}

export function statusForReceiptError(code: ReceiptErrorCode): number {
  return STATUS_BY_CODE[code];
}

/** Whether trying the same image again could help. */
export function isRetryable(code: ReceiptErrorCode): boolean {
  return code === "analysis_unavailable" || code === "rate_limited" || code === "unknown";
}

export function receiptErrorMessage(
  code: ReceiptErrorCode,
  t: Dictionary["errors"],
): string {
  switch (code) {
    case "unsupported_image":
      return t.receiptUnsupported;
    case "image_too_large":
      return t.receiptTooLarge;
    case "receipt_unreadable":
      return t.receiptUnreadable;
    case "analysis_unavailable":
      return t.receiptUnavailable;
    case "rate_limited":
      return t.receiptRateLimited;
    case "not_found":
      return t.notFound;
    default:
      return t.unknown;
  }
}
