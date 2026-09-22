import { z } from "zod";
import { groupExpensesByCategory, groupExpensesByDate } from "@/lib/calculations/expenses";
import { defineTool } from "./types";
import { requireTrip } from "./access";

const tripIdInput = z.object({ tripId: z.string().uuid() });

export const getSpendingByCategory = defineTool({
  name: "getSpendingByCategory",
  description: "Total spent per category for the trip, highest first.",
  inputSchema: tripIdInput,
  async run(ctx, { tripId }) {
    await requireTrip(ctx, tripId);
    const expenses = await ctx.sdk.expenses.listForTrip(tripId);
    return groupExpensesByCategory(expenses).map((c) => ({ category: c.name, amount: c.amount }));
  },
});

const dateRangeInput = z.object({
  tripId: z.string().uuid(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from must be YYYY-MM-DD"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "to must be YYYY-MM-DD"),
});

export const getSpendingByDateRange = defineTool({
  name: "getSpendingByDateRange",
  description: "Total spent and a day-by-day breakdown between two dates (inclusive), both YYYY-MM-DD.",
  inputSchema: dateRangeInput,
  async run(ctx, { tripId, from, to }) {
    await requireTrip(ctx, tripId);
    const expenses = await ctx.sdk.expenses.listForTrip(tripId);
    const inRange = expenses.filter((e) => e.expense_date >= from && e.expense_date <= to);
    const byDate = groupExpensesByDate(inRange);
    return {
      from,
      to,
      total: byDate.reduce((sum, d) => sum + d.amount, 0),
      byDate,
    };
  },
});

const recentExpensesInput = z.object({
  tripId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).default(10),
});

/**
 * description/merchant are the user's own free-text fields — returned as
 * plain data for the model to summarize, never as instructions (see
 * lib/ai/copilot's system prompt). Deliberately excludes notes/location:
 * a receipt's full item list or an address isn't needed to answer a
 * spending question, so it isn't sent to the model at all.
 */
export const getRecentExpenses = defineTool({
  name: "getRecentExpenses",
  description: "The trip's most recent expenses (up to 20), newest first.",
  inputSchema: recentExpensesInput,
  async run(ctx, { tripId, limit }) {
    await requireTrip(ctx, tripId);
    const expenses = await ctx.sdk.expenses.listForTrip(tripId);
    return expenses.slice(0, limit).map((e) => ({
      date: e.expense_date,
      description: e.description,
      merchant: e.merchant,
      category: e.category.name,
      amount: e.amount,
      currency: e.currency,
      convertedAmount: e.converted_amount,
    }));
  },
});
