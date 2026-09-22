import { describe, expect, it } from "vitest";
import { createDb } from "./harness";

/**
 * A table can carry perfectly good policies and still leak everything if
 * `enable row level security` was never run on it — a real, easy-to-make
 * mistake (0014 fixed exactly this for expense_splits before it shipped).
 * This is the regression guard: every table this app writes real user or
 * financial data to must have RLS switched on, checked directly against
 * Postgres's own catalog rather than trusting any migration's comments.
 */
describe("every user-facing table has row level security enabled", () => {
  it("relrowsecurity is true for every financial and personal-data table", async () => {
    const db = await createDb();
    const { rows } = await db.query<{ relname: string; relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class
       where relnamespace = 'public'::regnamespace and relkind = 'r'
       order by relname`,
    );
    const byName = new Map(rows.map((r) => [r.relname, r.relrowsecurity]));
    const expected = [
      "categories",
      "expense_splits",
      "expenses",
      "planned_budgets",
      "profiles",
      "settlements",
      "trip_members",
      "trips",
    ];
    for (const table of expected) {
      expect(byName.get(table), `${table} should exist`).toBeDefined();
      expect(byName.get(table), `${table} should have RLS enabled`).toBe(true);
    }
  });
});
