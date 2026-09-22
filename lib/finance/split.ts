import { allocateByWeight, currencyExponent, fromMinorUnits, toMinorUnits } from "./money";

export type SplitMethod = "equal" | "exact" | "percentage";

export type SplitParticipant =
  | { userId: string; method: "equal" }
  | { userId: string; method: "exact"; amount: number }
  | { userId: string; method: "percentage"; percent: number };

export type SplitShare = { userId: string; shareAmount: number; sharePercent: number | null };

/** Same codes the database's deferred triggers raise (0013_expense_splits.sql). */
export type SplitIssueCode =
  | "VB003" // shares don't add up to the total
  | "VB004" // percentages don't add up to 100
  | "VB005" // an "equal" split isn't actually equal (shouldn't happen — we compute it)
  | "VB007" // a share is finer than the currency's smallest unit
  | "NO_PARTICIPANTS"
  | "DUPLICATE_PARTICIPANT"
  | "NEGATIVE_SHARE";

export type SplitResult =
  | { ok: true; shares: SplitShare[] }
  | { ok: false; code: SplitIssueCode; message: string };

function fail(code: SplitIssueCode, message: string): SplitResult {
  return { ok: false, code, message };
}

/**
 * Computes each participant's share of `totalAmount`, entirely in integer
 * minor units — no floating-point arithmetic touches the total. Mirrors the
 * invariants `private.check_expense_split` enforces in Postgres, so a form
 * can show this exact rejection before the write round-trips to the server.
 */
export function calculateSplit(
  method: SplitMethod,
  totalAmount: number,
  currency: string,
  participants: SplitParticipant[],
): SplitResult {
  const ids = participants.map((p) => p.userId);
  if (ids.length === 0) return fail("NO_PARTICIPANTS", "a split needs at least one participant");
  if (new Set(ids).size !== ids.length) {
    return fail("DUPLICATE_PARTICIPANT", "the same person is listed twice");
  }

  const totalMinor = toMinorUnits(totalAmount, currency);

  if (method === "equal") {
    const minorShares = allocateByWeight(totalMinor, ids.map(() => 1n));
    return {
      ok: true,
      shares: ids.map((userId, i) => ({
        userId,
        shareAmount: fromMinorUnits(minorShares[i], currency),
        sharePercent: null,
      })),
    };
  }

  if (method === "exact") {
    const entries = participants as Extract<SplitParticipant, { method: "exact" }>[];
    if (entries.some((p) => p.amount < 0)) {
      return fail("NEGATIVE_SHARE", "a share cannot be negative");
    }
    const minorShares = entries.map((p) => toMinorUnits(p.amount, currency));
    const sum = minorShares.reduce((a, b) => a + b, 0n);
    if (sum !== totalMinor) {
      return fail(
        "VB003",
        `shares (${fromMinorUnits(sum, currency)}) must add up to the total (${totalAmount})`,
      );
    }
    return {
      ok: true,
      shares: entries.map((p, i) => ({
        userId: p.userId,
        shareAmount: fromMinorUnits(minorShares[i], currency),
        sharePercent: null,
      })),
    };
  }

  // percentage: percents carry up to 4 decimal places (numeric(7,4)), so work
  // in integer hundred-thousandths (percent * 10_000) to stay exact.
  const entries = participants as Extract<SplitParticipant, { method: "percentage" }>[];
  if (entries.some((p) => p.percent < 0)) {
    return fail("NEGATIVE_SHARE", "a percentage cannot be negative");
  }
  const basisPoints = entries.map((p) => BigInt(Math.round(p.percent * 10_000)));
  const basisSum = basisPoints.reduce((a, b) => a + b, 0n);
  if (basisSum !== 1_000_000n) {
    return fail(
      "VB004",
      `percentages (${Number(basisSum) / 10_000}) must add up to 100`,
    );
  }
  const minorShares = allocateByWeight(totalMinor, basisPoints);
  return {
    ok: true,
    shares: entries.map((p, i) => ({
      userId: p.userId,
      shareAmount: fromMinorUnits(minorShares[i], currency),
      sharePercent: p.percent,
    })),
  };
}

/** Rounds a manually-typed amount down to what the currency can represent. */
export function roundToCurrency(amount: number, currency: string): number {
  const factor = 10 ** currencyExponent(currency);
  return Math.round(amount * factor) / factor;
}
