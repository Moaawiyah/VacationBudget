import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { payerLabel, payerNameMap } from "@/components/expenses/payer-label";
import { ExpenseRow } from "@/components/expenses/expense-row";
import type { ExpenseWithCategory } from "@/types/expense";

vi.stubGlobal("React", React);

const names = payerNameMap([
  { userId: "u-moa", username: "moa", firstName: "Moa", surname: "H", status: "owner" },
  { userId: "u-alex", username: "alex", firstName: "", surname: "", status: "accepted" },
]);

describe("payerLabel", () => {
  it("names another traveler by display name", () => {
    expect(payerLabel("u-moa", "u-alex", names, en.expenses)).toBe("Paid by Moa H");
  });

  it("falls back to @username when no name is set", () => {
    expect(payerLabel("u-alex", "u-moa", names, en.expenses)).toBe("Paid by @alex");
  });

  it("says 'you' for the signed-in user's own expenses", () => {
    expect(payerLabel("u-moa", "u-moa", names, en.expenses)).toBe("Paid by you");
  });

  it("omits the line for someone no longer on the trip, rather than showing a raw id", () => {
    expect(payerLabel("u-gone", "u-moa", names, en.expenses)).toBeNull();
  });
});

describe("ExpenseRow payer line", () => {
  const expense = {
    id: "e1",
    description: "Dinner",
    amount: 40,
    currency: "EUR",
    converted_amount: 40,
    paid_by: "u-moa",
    category: { name: "Food", icon: "utensils-crossed" },
  } as unknown as ExpenseWithCategory;
  const props = { tripId: "t1", expense, baseCurrency: "EUR", bcp47: "en-US", dict: en };

  it("shows the payer in a faded line below the category", () => {
    const html = renderToStaticMarkup(createElement(ExpenseRow, { ...props, payer: "Paid by Moa H" }));
    expect(html).toContain('class="text-muted-foreground/70 truncate text-[11px]">Paid by Moa H</p>');
  });

  it("renders no payer line when none is given", () => {
    const html = renderToStaticMarkup(createElement(ExpenseRow, props));
    expect(html).not.toContain("Paid by");
  });
});
