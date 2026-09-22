import { describe, expect, it } from "vitest";
import { z } from "zod";
import { appErrorMessage } from "@/lib/i18n/app-error";
import en from "@/lib/i18n/dictionaries/en";
import { newRequestId } from "@/lib/request-id";
import { APP_ERROR_FALLBACK, classifyDbError } from "@/lib/sdk/errors";

describe("classifyDbError", () => {
  it.each([
    ["42501", "permission_denied"],
    ["VB002", "permission_denied"],
    ["23505", "duplicate"],
    ["VB001", "currency_locked"],
    ["23514", "invalid_data"],
    ["23503", "invalid_data"],
    ["22P02", "invalid_data"],
    ["PGRST116", "not_found"],
  ])("maps %s to %s", (code, expected) => {
    expect(classifyDbError({ code })).toBe(expected);
  });

  it("falls back to unknown for unmapped or missing codes", () => {
    expect(classifyDbError({ code: "XX000" })).toBe("unknown");
    expect(classifyDbError({})).toBe("unknown");
  });

  it("has fallback text for every code that reveals no schema details", () => {
    for (const text of Object.values(APP_ERROR_FALLBACK)) {
      expect(text).not.toMatch(/policy|constraint|table|relation|violates/i);
    }
  });
});

describe("appErrorMessage", () => {
  it("translates a code into the current dictionary", () => {
    expect(appErrorMessage("currency_locked", en.errors)).toBe(en.errors.currencyLocked);
  });

  it("treats a missing code as unknown", () => {
    expect(appErrorMessage(undefined, en.errors)).toBe(en.errors.unknown);
  });

  it("lets the caller name what was denied", () => {
    expect(
      appErrorMessage("permission_denied", en.errors, {
        permission_denied: en.errors.expensePermissionDenied,
      }),
    ).toBe("You do not have permission to modify this expense.");
  });
});

describe("newRequestId", () => {
  it("produces UUIDs the server-side schema accepts", () => {
    expect(z.string().uuid().safeParse(newRequestId()).success).toBe(true);
  });

  it("builds a valid v4 UUID without randomUUID (non-secure contexts)", () => {
    const original = crypto.randomUUID;
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      const id = newRequestId();
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    } finally {
      Object.defineProperty(crypto, "randomUUID", {
        value: original,
        configurable: true,
      });
    }
  });

  it("does not repeat", () => {
    expect(new Set(Array.from({ length: 50 }, newRequestId)).size).toBe(50);
  });
});
