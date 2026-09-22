import { afterEach, describe, expect, it, vi } from "vitest";
import { CURRENCIES, CURRENCY_CODES } from "@/lib/currency/constants";
import { convertCurrency } from "@/lib/currency/convert";
import { formatCurrency } from "@/lib/currency/format";
import { formatDateHeading, formatDateRange } from "@/lib/format-date";

afterEach(() => vi.useRealTimers());

describe("currency", () => {
  it("converts and rounds to cents", () => {
    expect(convertCurrency(10, 0.915)).toBe(9.15);
    expect(convertCurrency(1, 1 / 3)).toBe(0.33);
  });

  it("formats with the currency's own symbol", () => {
    expect(formatCurrency(12.5, "EUR", "en")).toBe("€12.50");
    expect(formatCurrency(1000, "USD", "en")).toBe("$1,000.00");
  });

  it("offers a curated list of currency codes", () => {
    expect(CURRENCY_CODES).toEqual(CURRENCIES.map((c) => c.code));
    expect(CURRENCY_CODES).toContain("ILS");
  });
});

describe("dates", () => {
  it("formats a range, adding the start year only when years differ", () => {
    expect(formatDateRange("2026-10-03", "2026-10-14", "en")).toBe(
      "Oct 3 – Oct 14, 2026",
    );
    expect(formatDateRange("2026-12-28", "2027-01-03", "en")).toBe(
      "Dec 28, 2026 – Jan 3, 2027",
    );
  });

  it("labels today and yesterday, and spells out other days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-06T10:00:00Z"));
    expect(formatDateHeading("2026-10-06", "en", "Today", "Yesterday")).toBe("Today");
    expect(formatDateHeading("2026-10-05", "en", "Today", "Yesterday")).toBe("Yesterday");
    expect(formatDateHeading("2026-10-01", "en", "Today", "Yesterday")).toBe(
      "Thursday, October 1",
    );
  });
});
