/**
 * Stable, user-safe codes for failed data operations. Raw database messages
 * name tables, policies and constraints — BaseService.fail logs those for
 * developers and hands callers only one of these codes, which the Server
 * Actions translate into the user's language (see lib/i18n/app-error.ts).
 */
export type AppErrorCode =
  | "permission_denied"
  | "duplicate"
  | "currency_locked"
  | "invalid_data"
  | "not_found"
  | "unknown";

/** Postgres SQLSTATEs (and PostgREST codes) → app codes. VBxxx are ours. */
const BY_CODE: Record<string, AppErrorCode> = {
  "42501": "permission_denied", // RLS policy or column privilege
  VB002: "permission_denied", // expense owner/trip is immutable (0010)
  "23505": "duplicate",
  VB001: "currency_locked", // trip currency locked once expenses exist (0010)
  VB003: "invalid_data", // split shares don't add up to the expense total (0013)
  VB004: "invalid_data", // split percentages don't add up to 100 (0013)
  VB005: "invalid_data", // an "equal" split isn't actually equal (0013)
  VB006: "permission_denied", // payer/split participant isn't a trip participant (0013)
  VB007: "invalid_data", // a share is finer than the currency's smallest unit (0013)
  "23514": "invalid_data", // check constraint
  "23503": "invalid_data", // foreign key
  "23502": "invalid_data", // not null
  "22P02": "invalid_data", // malformed value, e.g. a non-UUID id
  PGRST116: "not_found", // .single() matched no row
};

export function classifyDbError(error: { code?: string }): AppErrorCode {
  return (error.code && BY_CODE[error.code]) || "unknown";
}

/**
 * Plain-English fallbacks for callers without a dictionary (logs, scripts).
 * Nothing here reveals schema details.
 */
export const APP_ERROR_FALLBACK: Record<AppErrorCode, string> = {
  permission_denied: "You do not have permission to do that.",
  duplicate: "That already exists.",
  currency_locked: "The trip currency can't change once it has expenses.",
  invalid_data: "Some of the details aren't valid.",
  not_found: "Not found.",
  unknown: "Something went wrong. Please try again.",
};
