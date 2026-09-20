import { describe, expect, it } from "vitest";
import { mapReceiptToExpenseDefaults } from "@/lib/receipts/map-to-expense";
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
    line_items: [],
    warnings: [],
    raw_ocr_text: "",
    confidence: 0,
    ...overrides,
  };
}

describe("mapReceiptToExpenseDefaults", () => {
  it("maps the core fields and falls back to the trip's base currency", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({ merchant: "Cafe Roma", total: 12.5, currency: null, expense_date: "2026-01-10" }),
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
    expect(mapReceiptToExpenseDefaults(receipt({ merchant: "   " }), "EUR").merchant).toBeUndefined();
    expect(mapReceiptToExpenseDefaults(receipt({ merchant: null }), "EUR").description).toBeUndefined();
  });

  it("composes notes from subtotal, tax and line items", () => {
    const defaults = mapReceiptToExpenseDefaults(
      receipt({
        subtotal: 10,
        tax: 1,
        line_items: [{ description: "Coffee", quantity: 1, unit_price: 3, total_price: 3 }],
      }),
      "EUR",
    );
    expect(defaults.notes).toContain("Subtotal: 10");
    expect(defaults.notes).toContain("Tax/VAT: 1");
    expect(defaults.notes).toContain("- Coffee (3)");
  });

  it("includes the translation only when the receipt isn't already English", () => {
    const translated = mapReceiptToExpenseDefaults(
      receipt({ detected_language: "it", translation: "Total: 10 euros" }),
      "EUR",
    );
    expect(translated.notes).toContain("Translation: Total: 10 euros");

    const english = mapReceiptToExpenseDefaults(
      receipt({ detected_language: "en", translation: "Total: 10 euros" }),
      "EUR",
    );
    expect(english.notes).toBeUndefined();
  });

  it("leaves notes unset when there is nothing to compose", () => {
    expect(mapReceiptToExpenseDefaults(receipt(), "EUR").notes).toBeUndefined();
  });
});
