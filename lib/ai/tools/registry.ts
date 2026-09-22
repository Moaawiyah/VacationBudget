import { getTravelerBalances, getSettlementSuggestions } from "./balance-tools";
import { simulateExpense } from "./simulate-expense";
import { getSpendingByCategory, getSpendingByDateRange, getRecentExpenses } from "./spending-tools";
import { getTripSummary, getBudgetStatus, getBudgetForecast, getPlannedBudgets } from "./trip-tools";
import { toToolDefinition, type Tool } from "./types";

/**
 * Every tool the copilot may call — deliberately never `executeSql`,
 * `queryDatabase`, or anything else that runs arbitrary code or SQL.
 * Each one independently re-checks trip access (see access.ts) and reads
 * only through the request-scoped SDK, never the service-role client.
 */
export const TOOLS: Tool<unknown, unknown>[] = [
  getTripSummary,
  getBudgetStatus,
  getBudgetForecast,
  getPlannedBudgets,
  getSpendingByCategory,
  getSpendingByDateRange,
  getRecentExpenses,
  getTravelerBalances,
  getSettlementSuggestions,
  simulateExpense,
] as Tool<unknown, unknown>[];

export const TOOLS_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]));

export const TOOL_DEFINITIONS = TOOLS.map(toToolDefinition);
