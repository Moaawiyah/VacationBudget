import type { AIProvider } from "@/lib/ai/provider";
import type { ToolContext } from "@/lib/ai/tools/types";
import { requireTrip } from "@/lib/ai/tools/access";
import { mergePlannedAndActual } from "@/lib/calculations/expenses";
import { detectSignals } from "./detect";
import { explainSignals, type SpendingInsight } from "./explain";

// Same facts → same sentence: an explanation is reused until the signals
// themselves change (a new expense, a new day), so reloading the dashboard
// never re-asks the model. In-memory for the same reason lib/rate-limit.ts
// is (a single Node process); a failed call is remembered briefly so an
// outage doesn't turn every dashboard view into another slow retry.
const SUCCESS_TTL_MS = 6 * 60 * 60 * 1000;
const FAILURE_TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;
const cache = new Map<string, { insights: SpendingInsight[]; expiresAt: number }>();

function remember(key: string, insights: SpendingInsight[], ttlMs: number): void {
  if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  cache.set(key, { insights, expiresAt: Date.now() + ttlMs });
}

/** Test hook — the cache is module state. */
export function clearInsightCache(): void {
  cache.clear();
}

/**
 * The dashboard's insight card, end to end: loads the trip through the
 * viewer's own RLS-scoped SDK, detects signals deterministically, and only
 * then — if there's anything worth saying — asks the model to phrase it.
 * Returns [] whenever there's nothing to show, for whatever reason.
 */
export async function getTripInsights(
  ctx: ToolContext,
  provider: AIProvider | null,
  tripId: string,
  locale: string,
  now: Date = new Date(),
): Promise<SpendingInsight[]> {
  if (!provider) return [];
  const trip = await requireTrip(ctx, tripId);
  const [expenses, categories, plannedBudgets] = await Promise.all([
    ctx.sdk.expenses.listForTrip(tripId),
    ctx.sdk.categories.list(),
    ctx.sdk.plannedBudgets.listForTrip(tripId),
  ]);
  const signals = detectSignals({
    trip,
    expenses,
    plannedVsActual: mergePlannedAndActual(categories, plannedBudgets, expenses),
    now,
  });
  if (signals.length === 0) return [];

  const key = `${ctx.userId}|${tripId}|${locale}|${JSON.stringify(signals)}`;
  const hit = cache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.insights;

  const insights = await explainSignals(provider, signals, trip.base_currency, locale);
  remember(key, insights, insights.length > 0 ? SUCCESS_TTL_MS : FAILURE_TTL_MS);
  return insights;
}
