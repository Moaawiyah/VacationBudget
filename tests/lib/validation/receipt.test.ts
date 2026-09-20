import { describe, expect, it } from "vitest";
import { analyzeReceiptResponseSchema } from "@/lib/validation/receipt";

function validPayload() {
  return {
    receipt: {
      merchant: "Cafe Roma",
      expense_date: "2026-01-10",
      total: 12.5,
      subtotal: 11.5,
      tax: 1.0,
      currency: "EUR",
      category: "Food",
      detected_language: "it",
      translation: "Total: 12.50 EUR",
      line_items: [{ description: "Coffee", icon: "☕", quantity: 1, unit_price: 3, total_price: 3 }],
      warnings: [{ field: "merchant", message: "Low confidence", severity: "warning" }],
      raw_ocr_text: "CAFE ROMA\nTOTALE 12,50",
      confidence: 0.8,
    },
  };
}

describe("analyzeReceiptResponseSchema", () => {
  it("accepts a well-formed receipt-service response", () => {
    const result = analyzeReceiptResponseSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("accepts null for every optional field", () => {
    const payload = validPayload();
    payload.receipt.merchant = null as unknown as string;
    payload.receipt.currency = null as unknown as string;
    const result = analyzeReceiptResponseSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects a missing required field", () => {
    const payload = validPayload();
    // @ts-expect-error deliberately malformed for the test
    delete payload.receipt.raw_ocr_text;
    expect(analyzeReceiptResponseSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects an invalid warning severity", () => {
    const payload = validPayload();
    payload.receipt.warnings = [
      { field: "x", message: "y", severity: "critical" as "warning" },
    ];
    expect(analyzeReceiptResponseSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a wrong-typed amount field", () => {
    const payload = validPayload();
    // @ts-expect-error deliberately malformed for the test
    payload.receipt.total = "12.50";
    expect(analyzeReceiptResponseSchema.safeParse(payload).success).toBe(false);
  });

  it("rejects a completely malformed response", () => {
    expect(analyzeReceiptResponseSchema.safeParse({ foo: "bar" }).success).toBe(false);
  });
});
