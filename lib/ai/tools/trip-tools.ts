import { z } from "zod";
import { calculateBudgetForecast } from "@/lib/finance/forecast";
import { calculateTripStatus } from "@/lib/calculations/trip";
import { mergePlannedAndActual } from "@/lib/calculations/expenses";
import { defineTool } from "./types";
import { requireTrip } from "./access";

const tripIdInput = z.object({ tripId: z.string().uuid() });

/** Trip identity, status and top-line totals — the assistant's "what trip am I looking at" tool. */
export const getTripSummary = defineTool({
  name: "getTripSummary",
  description: "Basic facts about the trip: destination, dates, status, base currency, budget, traveler count.",
  inputSchema: tripIdInput,
  async run(ctx, { tripId }) {
    const trip = await requireTrip(ctx, tripId);
    const [expenses, companionResult] = await Promise.all([
      ctx.sdk.expenses.listForTrip(tripId),
      ctx.sdk.companions.listForTrip(ctx.userId, tripId),
    ]);
    const spent = expenses.reduce((sum, e) => sum + e.converted_amount, 0);
    return {
      name: trip.name,
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      status: calculateTripStatus(trip.start_date, trip.end_date),
      baseCurrency: trip.base_currency,
      totalBudget: trip.total_budget,
      totalSpent: spent,
      travelerCount: "companions" in companionResult ? companionResult.companions.length : 1,
      expenseCount: expenses.length,
    };
  },
});

/** Deterministic budget/remaining/over-budget status — no forecasting, just where things stand today. */
export const getBudgetStatus = defineTool({
  name: "getBudgetStatus",
  description: "Total budget, amount spent so far, and remaining budget for the trip, in its base currency.",
  inputSchema: tripIdInput,
  async run(ctx, { tripId }) {
    const trip = await requireTrip(ctx, tripId);
    const expenses = await ctx.sdk.expenses.listForTrip(tripId);
    const spent = expenses.reduce((sum, e) => sum + e.converted_amount, 0);
    return {
      currency: trip.base_currency,
      totalBudget: trip.total_budget,
      spent,
      remaining: trip.total_budget - spent,
      isOverBudget: spent > trip.total_budget,
    };
  },
});

/** The full deterministic forecast (lib/finance/forecast.ts) — days elapsed/remaining, pace, projection. */
export const getBudgetForecast = defineTool({
  name: "getBudgetForecast",
  description:
    "The trip's spending forecast: days elapsed/remaining, average and recommended daily spend, projected final spend, and projected over/under budget.",
  inputSchema: tripIdInput,
  async run(ctx, { tripId }) {
    const trip = await requireTrip(ctx, tripId);
    const expenses = await ctx.sdk.expenses.listForTrip(tripId);
    const spent = expenses.reduce((sum, e) => sum + e.converted_amount, 0);
    return calculateBudgetForecast(trip.start_date, trip.end_date, trip.total_budget, spent);
  },
});

/** Planned vs. actual per category — what was budgeted for each category and what's actually been spent. */
export const getPlannedBudgets = defineTool({
  name: "getPlannedBudgets",
  description: "Each category's planned budget next to what's actually been spent in it so far.",
  inputSchema: tripIdInput,
  async run(ctx, { tripId }) {
    await requireTrip(ctx, tripId);
    const [categories, plannedBudgets, expenses] = await Promise.all([
      ctx.sdk.categories.list(),
      ctx.sdk.plannedBudgets.listForTrip(tripId),
      ctx.sdk.expenses.listForTrip(tripId),
    ]);
    return mergePlannedAndActual(categories, plannedBudgets, expenses);
  },
});
