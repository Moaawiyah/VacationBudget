import { beforeEach, describe, expect, it } from "vitest";
import en from "@/lib/i18n/dictionaries/en";
import { mapReceiptToExpenseDefaults } from "@/lib/receipts/map-to-expense";
import { toExpenseRow } from "@/lib/sdk/expense-service";
import { createExpenseSchema } from "@/lib/validation/expense";
import { extractedReceiptSchema } from "@/lib/validation/receipt";
import type { Category } from "@/types/category";
import { asUser, errorCode } from "./harness";
import {
  MEMBER,
  OWNER,
  sharedTripScenario,
  STRANGER,
  TRIP,
  type Scenario,
} from "./fixture";

/** What receipt-service returns for an Italian trattoria receipt. */
const SERVICE_RESPONSE = {
  merchant: "Trattoria da Mario",
  expense_date: "2026-06-03",
  total: 16,
  subtotal: null,
  tax: 1.45,
  currency: "EUR",
  category: "Food",
  detected_language: "it",
  translation: null,
  line_items: [
    {
      description: "Pizza Margherita",
      icon: "🍕",
      quantity: 1,
      unit_price: null,
      total_price: 9.5,
    },
    {
      description: "Tiramisù",
      icon: "🍰",
      quantity: 1,
      unit_price: null,
      total_price: 6.5,
    },
  ],
  warnings: [],
  raw_ocr_text: "TRATTORIA DA MARIO ... VISA •••• 1111",
  confidence: 1,
};
const REQUEST_ID = "22222222-2222-2222-2222-222222222222";

let s: Scenario;
beforeEach(async () => {
  s = await sharedTripScenario();
});

async function confirmAsMember() {
  // 1. The web app validates the service response before trusting it.
  const receipt = extractedReceiptSchema.parse(SERVICE_RESPONSE);
  // 2. The member's categories come from the database, under RLS.
  const categories = await asUser(s.db, MEMBER, async () => {
    const { rows } = await s.db.query<Category>("select * from public.categories");
    return rows;
  });
  // 3. Pre-fill, then the user confirms — through the Server Action's schema.
  const defaults = mapReceiptToExpenseDefaults(receipt, "EUR", categories);
  const input = createExpenseSchema("EUR", en.validation).parse({ ...defaults });
  // 4. Insert as the member, with the form's idempotency key. The matching
  //    100%-share row lands in the same transaction, same as create_expense.
  const row = { ...toExpenseRow(input, "EUR"), converted_amount: 0 };
  return asUser(s.db, MEMBER, async () => {
    await s.db.exec("begin");
    try {
      const { rows } = await s.db.query<{ id: string }>(
        `insert into public.expenses (trip_id, user_id, client_request_id, category_id, amount,
           currency, exchange_rate, converted_amount, description, expense_date, merchant, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning id`,
        [
          TRIP,
          MEMBER,
          REQUEST_ID,
          row.category_id,
          row.amount,
          row.currency,
          row.exchange_rate,
          row.converted_amount,
          row.description,
          row.expense_date,
          row.merchant,
          row.notes,
        ],
      );
      await s.db.query(
        "insert into public.expense_splits (expense_id, user_id, share_amount) values ($1, $2, $3)",
        [rows[0].id, MEMBER, row.amount],
      );
      await s.db.exec("commit");
    } catch (error) {
      await s.db.exec("rollback");
      throw error;
    }
  });
}

describe("receipt → validation → confirmation → expense", () => {
  it("creates one correct expense, even when confirmed twice", async () => {
    await confirmAsMember();
    // Double tap / automatic retry of the same confirmation:
    expect(await errorCode(confirmAsMember)).toBe("23505");

    const { rows } = await asUser(s.db, OWNER, () =>
      s.db.query<{
        description: string;
        amount: string;
        converted_amount: string;
        notes: string;
        category: string;
      }>(
        `select e.description, e.amount, e.converted_amount, e.notes, c.name as category
         from public.expenses e join public.categories c on c.id = e.category_id
         where e.trip_id = $1`,
        [TRIP],
      ),
    );
    expect(rows).toHaveLength(1);
    const [expense] = rows;
    expect(expense.description).toBe("Trattoria da Mario");
    expect(Number(expense.amount)).toBe(16);
    expect(Number(expense.converted_amount)).toBe(16); // derived by the database
    expect(expense.category).toBe("Food"); // the LLM's pick, resolved to a real id
    expect(expense.notes).toBe("🍕 Pizza Margherita — 9.5\n🍰 Tiramisù — 6.5");
  });

  it("is invisible to someone outside the trip", async () => {
    await confirmAsMember();
    const { rows } = await asUser(s.db, STRANGER, () =>
      s.db.query("select 1 from public.expenses where trip_id = $1", [TRIP]),
    );
    expect(rows).toHaveLength(0);
  });
});
