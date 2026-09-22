import { describe, expect, it } from "vitest";
import { calculateSplit, roundToCurrency, type SplitParticipant } from "@/lib/finance/split";

const eq = (...ids: string[]): SplitParticipant[] => ids.map((userId) => ({ userId, method: "equal" }));

describe("equal split", () => {
  it("splits €100 three ways so it sums exactly to €100 (33.34/33.33/33.33)", () => {
    const result = calculateSplit("equal", 100, "EUR", eq("a", "b", "c"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares.map((s) => s.shareAmount)).toEqual([33.34, 33.33, 33.33]);
    expect(result.shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBeCloseTo(100, 10);
  });

  it("gives every yen to a JPY equal split (no fractional yen)", () => {
    const result = calculateSplit("equal", 1000, "JPY", eq("a", "b", "c"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares.every((s) => Number.isInteger(s.shareAmount))).toBe(true);
    expect(result.shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBe(1000);
  });

  it("rejects an empty participant list", () => {
    const result = calculateSplit("equal", 100, "EUR", []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_PARTICIPANTS");
  });

  it("rejects a duplicate participant", () => {
    const result = calculateSplit("equal", 100, "EUR", eq("a", "a"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("DUPLICATE_PARTICIPANT");
  });
});

describe("exact split", () => {
  it("accepts shares that add up to the total", () => {
    const result = calculateSplit("exact", 50, "EUR", [
      { userId: "a", method: "exact", amount: 30 },
      { userId: "b", method: "exact", amount: 20 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares).toEqual([
      { userId: "a", shareAmount: 30, sharePercent: null },
      { userId: "b", shareAmount: 20, sharePercent: null },
    ]);
  });

  it("rejects shares that fall short of the total", () => {
    const result = calculateSplit("exact", 50, "EUR", [
      { userId: "a", method: "exact", amount: 30 },
      { userId: "b", method: "exact", amount: 15 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VB003");
  });

  it("rejects shares that exceed the total", () => {
    const result = calculateSplit("exact", 50, "EUR", [
      { userId: "a", method: "exact", amount: 40 },
      { userId: "b", method: "exact", amount: 40 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VB003");
  });

  it("rejects a negative share", () => {
    const result = calculateSplit("exact", 50, "EUR", [
      { userId: "a", method: "exact", amount: 60 },
      { userId: "b", method: "exact", amount: -10 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NEGATIVE_SHARE");
  });
});

describe("percentage split", () => {
  it("accepts 33.33/33.33/33.34 as valid and reconciles the amounts", () => {
    const result = calculateSplit("percentage", 100, "EUR", [
      { userId: "a", method: "percentage", percent: 33.33 },
      { userId: "b", method: "percentage", percent: 33.33 },
      { userId: "c", method: "percentage", percent: 33.34 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shares.reduce((sum, s) => sum + s.shareAmount, 0)).toBeCloseTo(100, 10);
    expect(result.shares[0].sharePercent).toBe(33.33);
  });

  it("rejects 95% as not summing to 100", () => {
    const result = calculateSplit("percentage", 100, "EUR", [
      { userId: "a", method: "percentage", percent: 60 },
      { userId: "b", method: "percentage", percent: 35 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VB004");
  });

  it("rejects percentages over 100", () => {
    const result = calculateSplit("percentage", 100, "EUR", [
      { userId: "a", method: "percentage", percent: 60 },
      { userId: "b", method: "percentage", percent: 50 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("VB004");
  });

  it("allocates an uneven percentage split without losing a cent", () => {
    // €7.00 split 12.5/12.5/25/50 — per-share cents aren't whole numbers,
    // so the largest-remainder allocation has to make up the difference.
    const result = calculateSplit("percentage", 7, "EUR", [
      { userId: "a", method: "percentage", percent: 12.5 },
      { userId: "b", method: "percentage", percent: 12.5 },
      { userId: "c", method: "percentage", percent: 25 },
      { userId: "d", method: "percentage", percent: 50 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const minorSum = result.shares.reduce((sum, s) => sum + Math.round(s.shareAmount * 100), 0);
    expect(minorSum).toBe(700);
  });
});

describe("roundToCurrency", () => {
  it("rounds to the currency's minor unit", () => {
    expect(roundToCurrency(12.345, "EUR")).toBe(12.35);
    expect(roundToCurrency(1200.4, "JPY")).toBe(1200);
  });
});
