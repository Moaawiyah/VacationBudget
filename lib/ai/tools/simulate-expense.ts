import { z } from "zod";
import { CURRENCY_CODES } from "@/lib/currency/constants";
import { convertCurrency } from "@/lib/currency/convert";
import { fetchExchangeRate } from "@/lib/currency/exchange-rate";
import { calculateBudgetForecast } from "@/lib/finance/forecast";
import { defineTool, ToolError } from "./types";
import { requireTrip } from "./access";

const simulateExpenseInput = z.object({
  tripId: z.string().uuid(),
  amount: z.number().positive().max(10_000_000),
  currency: z.enum(CURRENCY_CODES).optional(),
});

/**
 * A read-only "what if I spent this" — never inserts a row. Reuses the same
 * FX conversion and forecast function a real expense would, so the answer
 * the assistant gives is exactly what would happen if the user actually
 * added it, not a separate estimate. `currency` defaults to the trip's own
 * base currency (the common case: "can I spend €200 today?"); a different
 * currency needs a live rate, and if one can't be found this fails clearly
 * rather than silently assuming a 1:1 rate.
 */
export const simulateExpense = defineTool({
  name: "simulateExpense",
  description:
    "Read-only what-if: how a hypothetical expense of this amount would change the trip's remaining budget and forecast. Does not create an expense.",
  inputSchema: simulateExpenseInput,
  async run(ctx, { tripId, amount, currency }) {
    const trip = await requireTrip(ctx, tripId);
    const expenseCurrency = currency ?? trip.base_currency;

    let convertedAmount = amount;
    if (expenseCurrency !== trip.base_currency) {
      const lookup = await fetchExchangeRate(expenseCurrency, trip.base_currency);
      if (!lookup) {
        throw new ToolError(
          "invalid_input",
          `No exchange rate available from ${expenseCurrency} to ${trip.base_currency} right now — try the amount in ${trip.base_currency}`,
        );
      }
      convertedAmount = convertCurrency(amount, lookup.rate);
    }

    const expenses = await ctx.sdk.expenses.listForTrip(tripId);
    const spent = expenses.reduce((sum, e) => sum + e.converted_amount, 0);
    const current = calculateBudgetForecast(trip.start_date, trip.end_date, trip.total_budget, spent);
    const after = calculateBudgetForecast(
      trip.start_date,
      trip.end_date,
      trip.total_budget,
      spent + convertedAmount,
    );

    return {
      currency: trip.base_currency,
      convertedAmount,
      currentRemaining: current.remaining,
      newRemaining: after.remaining,
      currentProjectedFinalSpend: current.projectedFinalSpend,
      newProjectedFinalSpend: after.projectedFinalSpend,
      // Positive: projected to finish over budget by this much. Negative: under.
      projectedDifferenceFromBudget: after.projectedFinalSpend - trip.total_budget,
      wouldExceedBudgetToday: spent + convertedAmount > trip.total_budget,
    };
  },
});
