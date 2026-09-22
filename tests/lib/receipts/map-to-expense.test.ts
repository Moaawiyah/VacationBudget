import { describe, expect, it } from "vitest";
import { mapReceiptToExpenseDefaults } from "@/lib/receipts/map-to-expense";
import { NOTES_MAX_LENGTH } from "@/lib/validation/expense";
import type { ExtractedReceipt } from "@/types/receipt";

function receipt(overrides: Partial<ExtractedReceipt> = {}): ExtractedReceipt {
  return {
    merchant: null,
    expense_date: null,
    total: null,
    subtotal: null,
    tax: null,
    currency: null,
    detected_language: null,
    translation: null,
    category: null,
    line_items: [],
    warnings: [],
    raw_ocr_text: "",
    confidence: 0,
    ...overrides,
  };
}

const CATEGORIES = [
  { id: "cat-food", name: "Food" },
  { id: "cat-transport", name: "Transport" },
] as unknown as Parameters<typeof mapReceiptToExpenseDefaults>[2];

describe("mapReceiptToExpenseDefaults", () => {
  it("maps the core fields and falls back to the trip's base currency", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({
        merchant: "Cafe Roma",
        total: 12.5,
        currency: null,
        expense_date: "2026-01-10",
      }),
      "EUR",
    );
    expect(defaults).toMatchObject({
      amount: 12.5,
      currency: "EUR",
      description: "Cafe Roma",
      merchant: "Cafe Roma",
      expense_date: "2026-01-10",
    });
  });

  it("prefers the receipt's own currency over the trip's base currency", () => {
    const defaults = mapReceiptToExpenseDefaults(receipt({ currency: "USD" }), "EUR");
    expect(defaults.currency).toBe("USD");
  });

  it("leaves merchant/description unset for a blank or missing merchant", () => {
    expect(
      mapReceiptToExpenseDefaults(receipt({ merchant: "   " }), "EUR").merchant,
    ).toBeUndefined();
    expect(
      mapReceiptToExpenseDefaults(receipt({ merchant: null }), "EUR").description,
    ).toBeUndefined();
  });

  it("puts only the items, each with its icon, in the notes", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({
        subtotal: 10,
        tax: 1,
        detected_language: "it",
        translation: "Total: 10 euros",
        line_items: [
          {
            description: "Coffee",
            icon: "☕",
            quantity: 1,
            unit_price: 3,
            total_price: 3,
          },
        ],
      }),
      "EUR",
    );
    expect(defaults.notes).toBe("☕ Coffee — 3");
  });

  it("shows each item's icon and includes quantity only when it isn't 1", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({
        line_items: [
          {
            description: "Espresso",
            icon: "☕",
            quantity: 2,
            unit_price: 2.5,
            total_price: 5,
          },
          {
            description: "Bus ticket",
            icon: "🚌",
            quantity: 1,
            unit_price: 2,
            total_price: 2,
          },
        ],
      }),
      "EUR",
    );
    expect(defaults.notes).toContain("☕ 2 × Espresso — 5");
    expect(defaults.notes).toContain("🚌 Bus ticket — 2");
  });

  it("keeps notes within the length the expense form accepts", () => {
    const manyItems = Array.from({ length: 100 }, (_, i) => ({
      description: `A fairly long item description number ${i}`,
      icon: "🛒",
      quantity: 1,
      unit_price: 9.99,
      total_price: 9.99,
    }));
    const defaults = mapReceiptToExpenseDefaults(
      receipt({ line_items: manyItems }),
      "EUR",
    );
    expect(defaults.notes!.length).toBeLessThanOrEqual(NOTES_MAX_LENGTH);
    expect(defaults.notes).toMatch(/…and \d+ more$/);
  });

  it("leaves notes unset when the receipt has no items", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({ subtotal: 10, tax: 1 }),
      "EUR",
    );
    expect(defaults.notes).toBeUndefined();
  });

  it("resolves a suggested category name to that category's id", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({ category: "Transport" }),
      "EUR",
      CATEGORIES,
    );
    expect(defaults.category_id).toBe("cat-transport");
  });

  it("matches the suggested category case-insensitively", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({ category: "  food " }),
      "EUR",
      CATEGORIES,
    );
    expect(defaults.category_id).toBe("cat-food");
  });

  it("leaves the category unset when the suggestion matches nothing", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({ category: "Crypto" }),
      "EUR",
      CATEGORIES,
    );
    expect(defaults.category_id).toBeUndefined();
  });

  it("leaves the category unset when the receipt suggests none", () => {
    const defaults = mapReceiptToExpenseDefaults(receipt(), "EUR", CATEGORIES);
    expect(defaults.category_id).toBeUndefined();
  });
});
