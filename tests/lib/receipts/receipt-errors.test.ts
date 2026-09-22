import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import {
  isRetryable,
  RECEIPT_ERROR_CODES,
  receiptErrorCode,
  receiptErrorMessage,
  statusForReceiptError,
} from "@/lib/receipts/receipt-errors";
import { warningMessages } from "@/lib/receipts/receipt-warnings";

describe("receiptErrorCode", () => {
  it("passes through a code the user can act on", () => {
    expect(receiptErrorCode(422, { code: "receipt_unreadable" })).toBe(
      "receipt_unreadable",
    );
  });

  it("hides service-internal codes behind unknown", () => {
    expect(receiptErrorCode(500, { code: "internal_error" })).toBe("unknown");
    expect(receiptErrorCode(401, { code: "unauthorized" })).toBe("unknown");
  });

  it("falls back to the HTTP status when the body has no usable code", () => {
    expect(receiptErrorCode(429, null)).toBe("rate_limited");
    expect(receiptErrorCode(413, "<html>")).toBe("image_too_large");
    expect(receiptErrorCode(503, {})).toBe("analysis_unavailable");
    expect(receiptErrorCode(502, undefined)).toBe("unknown");
  });
});

describe("receipt error presentation", () => {
  it("gives every code a status and a translated message", () => {
    for (const code of RECEIPT_ERROR_CODES) {
      expect(statusForReceiptError(code)).toBeGreaterThanOrEqual(400);
      expect(receiptErrorMessage(code, en.errors)).toBeTruthy();
    }
  });

  it("uses the wording the product asked for", () => {
    expect(receiptErrorMessage("receipt_unreadable", en.errors)).toBe(
      "Receipt could not be read.",
    );
    expect(receiptErrorMessage("analysis_unavailable", en.errors)).toBe(
      "Receipt analysis temporarily unavailable.",
    );
  });

  it("offers a retry only when trying again could help", () => {
    expect(isRetryable("analysis_unavailable")).toBe(true);
    expect(isRetryable("rate_limited")).toBe(true);
    expect(isRetryable("receipt_unreadable")).toBe(false);
    expect(isRetryable("unsupported_image")).toBe(false);
  });
});

describe("warningMessages", () => {
  const warning = (code: string) => ({
    code,
    field: "x",
    message: `developer detail for ${code}`,
    severity: "warning" as const,
  });

  it("translates by code and never shows the developer message", () => {
    const [text] = warningMessages([warning("total_missing")], en.receipts.warnings);
    expect(text).toBe("Could not determine total.");
  });

  it("de-duplicates repeated warnings", () => {
    const messages = warningMessages(
      [warning("low_confidence"), warning("low_confidence")],
      en.receipts.warnings,
    );
    expect(messages).toHaveLength(1);
  });

  it("falls back to a generic prompt for a code this build doesn't know", () => {
    const [text] = warningMessages([warning("brand_new_code")], en.receipts.warnings);
    expect(text).toBe(en.receipts.warnings.low_confidence);
    expect(text).not.toContain("brand_new_code");
  });
});
