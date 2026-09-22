import type { AppErrorCode } from "@/lib/sdk/errors";
import type { Dictionary } from "./types";

type ErrorMessages = Dictionary["errors"];

const KEY_BY_CODE: Record<AppErrorCode, keyof ErrorMessages> = {
  permission_denied: "permissionDenied",
  duplicate: "duplicate",
  currency_locked: "currencyLocked",
  invalid_data: "invalidData",
  not_found: "notFound",
  unknown: "unknown",
};

/**
 * The user-facing message for a failed write, in the current language.
 * `overrides` lets a caller say something more specific than the generic
 * text — e.g. naming *what* the user lacks permission to change.
 */
export function appErrorMessage(
  code: AppErrorCode | undefined,
  t: ErrorMessages,
  overrides: Partial<Record<AppErrorCode, string>> = {},
): string {
  const resolved = code ?? "unknown";
  return overrides[resolved] ?? t[KEY_BY_CODE[resolved]];
}
