import { describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { tripSchema } from "@/lib/validation/trip";
import { categorySchema, createExpenseSchema } from "@/lib/validation/expense";
import { loginSchema, registerSchema } from "@/lib/validation/auth";
import { expenseInput, tripInput } from "../helpers/fixtures";

const t = en.validation;
const firstMessage = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("tripSchema", () => {
  it("accepts a valid trip and coerces the budget", () => {
    const parsed = tripSchema(t).parse({ ...tripInput, total_budget: "99.5" });
    expect(parsed.total_budget).toBe(99.5);
  });

  it("rejects an end date before the start date", () => {
    const result = tripSchema(t).safeParse({ ...tripInput, end_date: "2026-09-30" });
    expect(firstMessage(result)).toBe(t.endDateBeforeStart);
  });

  it("rejects a missing name and a negative budget", () => {
    expect(firstMessage(tripSchema(t).safeParse({ ...tripInput, name: " " }))).toBe(
      t.tripNameRequired,
    );
    expect(
      firstMessage(tripSchema(t).safeParse({ ...tripInput, total_budget: -1 })),
    ).toBe(t.budgetNegative);
  });
});

describe("createExpenseSchema", () => {
  it("needs no rate for the trip's own currency", () => {
    expect(createExpenseSchema("EUR", t).safeParse(expenseInput).success).toBe(true);
  });

  it("requires a rate for a foreign currency", () => {
    const result = createExpenseSchema("EUR", t).safeParse({
      ...expenseInput,
      currency: "USD",
    });
    expect(firstMessage(result)).toBe(t.exchangeRateRequired);
    const withRate = { ...expenseInput, currency: "USD", exchange_rate: "0.9" };
    expect(createExpenseSchema("EUR", t).safeParse(withRate).success).toBe(true);
  });

  it("rejects a zero amount and a non-uuid category", () => {
    const schema = createExpenseSchema("EUR", t);
    expect(firstMessage(schema.safeParse({ ...expenseInput, amount: 0 }))).toBe(
      t.amountPositive,
    );
    expect(firstMessage(schema.safeParse({ ...expenseInput, category_id: "x" }))).toBe(
      t.categoryChoose,
    );
  });
});

describe("categorySchema", () => {
  it("trims and requires a name", () => {
    expect(categorySchema(t).parse({ name: "  Gifts " }).name).toBe("Gifts");
    expect(firstMessage(categorySchema(t).safeParse({ name: "" }))).toBe(
      t.categoryNameRequired,
    );
  });
});

describe("auth schemas", () => {
  it("validate email and password", () => {
    expect(loginSchema(t).safeParse({ email: "a@b.co", password: "x" }).success).toBe(
      true,
    );
    expect(firstMessage(loginSchema(t).safeParse({ email: "nope", password: "x" }))).toBe(
      t.emailInvalid,
    );
    expect(
      firstMessage(registerSchema(t).safeParse({ email: "a@b.co", password: "short" })),
    ).toBe(t.passwordMin8);
  });
});
