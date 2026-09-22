import { describe, expect, it } from "vitest";
import { computeItemSplit } from "@/components/receipts/receipt-item-split";
import type { ReceiptLineItem } from "@/types/receipt";

const item = (description: string, total_price: number): ReceiptLineItem => ({
  description,
  icon: "•",
  quantity: 1,
  unit_price: null,
  total_price,
});

describe("computeItemSplit", () => {
  it("gives a solo item entirely to its one assignee, tax included in the remainder", () => {
    const items = [item("Pizza", 10), item("Beer", 5)];
    const amounts = computeItemSplit(
      items,
      [["a"], ["b"]],
      ["a", "b"],
      16, // 15 of items + 1 of tax/rounding
      "EUR",
    );
    expect(amounts.a).toBeCloseTo(10.67, 2); // 10 + half of the 1 remainder
    expect(amounts.b).toBeCloseTo(5.33, 2);
    expect(Math.round(amounts.a * 100) + Math.round(amounts.b * 100)).toBe(1600);
  });

  it("splits a shared item evenly among its assignees", () => {
    const items = [item("Shared starter", 10)];
    const amounts = computeItemSplit(items, [["a", "b"]], ["a", "b"], 10, "EUR");
    expect(amounts).toEqual({ a: 5, b: 5 });
  });

  it("reconciles exactly to the total even with an odd remainder (rounding never lost)", () => {
    const items = [item("Coffee", 1)];
    const amounts = computeItemSplit(items, [["a"]], ["a", "b", "c"], 10, "EUR");
    const totalMinor = Object.values(amounts).reduce((sum, v) => sum + Math.round(v * 100), 0);
    expect(totalMinor).toBe(1000);
  });

  it("falls back to an even split of the whole total when nothing is assigned yet", () => {
    const items = [item("Pizza", 10)];
    const amounts = computeItemSplit(items, [[]], ["a", "b"], 10, "EUR");
    expect(amounts).toEqual({ a: 5, b: 5 });
  });

  it("ignores items with no known price, folding their cost into the remainder", () => {
    const mystery: ReceiptLineItem = { ...item("Mystery item", 0), total_price: null };
    const amounts = computeItemSplit([mystery], [["a"]], ["a", "b"], 20, "EUR");
    // The unpriced item contributes nothing to "assigned"; the whole €20
    // falls to the equal-split fallback since no weight was ever assigned.
    expect(amounts).toEqual({ a: 10, b: 10 });
  });
});
