import { z } from "zod";
import { applySettlements, calculateBalances } from "@/lib/finance/balances";
import { suggestSettlements } from "@/lib/finance/settlement";
import { companionDisplayName } from "@/types/companion";
import type { VacationBudgetSDK } from "@/lib/sdk/sdk";
import { defineTool } from "./types";
import { requireTrip } from "./access";

const tripIdInput = z.object({ tripId: z.string().uuid() });

async function companionNames(sdk: VacationBudgetSDK, userId: string, tripId: string) {
  const result = await sdk.companions.listForTrip(userId, tripId);
  const companions = "companions" in result ? result.companions : [];
  return new Map(companions.map((c) => [c.userId, companionDisplayName(c)]));
}

/** Settled (post-settlement) balances for the trip, in its base currency. */
async function settledBalances(sdk: VacationBudgetSDK, tripId: string, baseCurrency: string) {
  const [expenses, settlements] = await Promise.all([
    sdk.expenses.listWithSplitsForTrip(tripId),
    sdk.settlements.listForTrip(tripId),
  ]);
  return applySettlements(
    baseCurrency,
    calculateBalances(baseCurrency, expenses),
    settlements.map((s) => ({ fromUserId: s.fromUserId, toUserId: s.toUserId, amount: s.amount })),
  );
}

/** Who's owed money and who owes it, right now — expenses folded together with anything already settled (lib/finance/balances.ts). */
export const getTravelerBalances = defineTool({
  name: "getTravelerBalances",
  description:
    "Each traveler's balance: how much they paid, their own share, and their current net balance (positive = owed money, negative = owes money).",
  inputSchema: tripIdInput,
  async run(ctx, { tripId }) {
    const trip = await requireTrip(ctx, tripId);
    const [balances, names] = await Promise.all([
      settledBalances(ctx.sdk, tripId, trip.base_currency),
      companionNames(ctx.sdk, ctx.userId, tripId),
    ]);
    return {
      currency: trip.base_currency,
      balances: balances.map((b) => ({ traveler: names.get(b.userId) ?? b.userId, ...b })),
    };
  },
});

/** The live-computed minimal transfers that would zero every balance — never persisted (lib/finance/settlement.ts). */
export const getSettlementSuggestions = defineTool({
  name: "getSettlementSuggestions",
  description: "The minimal set of payments that would settle every traveler's balance to zero.",
  inputSchema: tripIdInput,
  async run(ctx, { tripId }) {
    const trip = await requireTrip(ctx, tripId);
    const [balances, names] = await Promise.all([
      settledBalances(ctx.sdk, tripId, trip.base_currency),
      companionNames(ctx.sdk, ctx.userId, tripId),
    ]);
    const suggestions = suggestSettlements(trip.base_currency, balances);
    return {
      currency: trip.base_currency,
      suggestions: suggestions.map((s) => ({
        from: names.get(s.fromUserId) ?? s.fromUserId,
        to: names.get(s.toUserId) ?? s.toUserId,
        amount: s.amount,
      })),
    };
  },
});
