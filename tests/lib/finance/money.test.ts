import { describe, expect, it } from "vitest";
import { allocateByWeight, currencyExponent, fromMinorUnits, toMinorUnits } from "@/lib/finance/money";

describe("currencyExponent", () => {
  it("JPY has no minor unit; everything else has two decimals", () => {
    expect(currencyExponent("JPY")).toBe(0);
    expect(currencyExponent("EUR")).toBe(2);
    expect(currencyExponent("USD")).toBe(2);
  });
});

describe("minor unit conversion", () => {
  it("round-trips major/minor amounts", () => {
    expect(toMinorUnits(12.34, "EUR")).toBe(1234n);
    expect(fromMinorUnits(1234n, "EUR")).toBe(12.34);
    expect(toMinorUnits(500, "JPY")).toBe(500n);
    expect(fromMinorUnits(500n, "JPY")).toBe(500);
  });
});

describe("allocateByWeight", () => {
  it("splits €100 three ways as 33.34/33.33/33.33, exactly reconciling", () => {
    const shares = allocateByWeight(10000n, [1n, 1n, 1n]);
    expect(shares).toEqual([3334n, 3333n, 3333n]);
    expect(shares.reduce((a, b) => a + b, 0n)).toBe(10000n);
  });

  it("splits proportionally to weights", () => {
    const shares = allocateByWeight(9000n, [1n, 2n]);
    expect(shares).toEqual([3000n, 6000n]);
  });

  it("gives every share to the sole participant", () => {
    expect(allocateByWeight(500n, [1n])).toEqual([500n]);
  });

  it("handles a zero total without dropping or fabricating money", () => {
    expect(allocateByWeight(0n, [1n, 1n, 1n])).toEqual([0n, 0n, 0n]);
  });

  it("rejects all-zero weights instead of dividing by zero", () => {
    expect(() => allocateByWeight(100n, [0n, 0n])).toThrow();
  });

  it("breaks remainder ties by index, deterministically", () => {
    // 7 split three equal ways: base 2 each, 1 leftover → first index wins.
    expect(allocateByWeight(7n, [1n, 1n, 1n])).toEqual([3n, 2n, 2n]);
  });
});
