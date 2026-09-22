"use server";

import { z } from "zod";
import { requireUser } from "@/lib/sdk/server";
import { getDictionary } from "@/lib/i18n/server";
import { rateLimit } from "@/lib/rate-limit";
import { getAIProvider } from "@/lib/ai/provider";
import { runCopilotTurn, type CopilotError, type CopilotTurn } from "@/lib/ai/copilot/orchestrate";

// Each question is one or more paid LLM calls (tool rounds) — capped per
// user, the same reasoning receipts/analyze uses for its own rate limit.
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

const turnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(2000),
});
const requestSchema = z.object({
  history: z.array(turnSchema).max(20),
  message: z.string().trim().min(1).max(500),
});

/**
 * One copilot turn, scoped to `tripId` for the whole call — see
 * lib/ai/copilot/orchestrate.ts for how every tool call stays pinned to
 * this trip regardless of what a tool-call argument says. Read-only: this
 * action itself never writes anything, and neither can anything it calls.
 */
export async function askCopilot(
  tripId: string,
  request: { history: CopilotTurn[]; message: string },
): Promise<{ reply: string; toolsUsed: string[] } | { error: string }> {
  const dict = await getDictionary();
  const { sdk, user } = await requireUser();

  const trip = await sdk.trips.get(tripId);
  if (!trip) return { error: dict.trips.tripNotFound };

  const parsed = requestSchema.safeParse(request);
  if (!parsed.success) return { error: dict.ai.copilotErrorGeneric };

  const { allowed } = rateLimit(`copilot:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!allowed) return { error: dict.ai.copilotRateLimited };

  const provider = getAIProvider();
  if (!provider) return { error: dict.ai.copilotUnavailable };

  const result = await runCopilotTurn(
    provider,
    { sdk, userId: user.id },
    tripId,
    parsed.data.history,
    parsed.data.message,
  );
  if ("error" in result) {
    const messages: Record<CopilotError, string> = {
      unavailable: dict.ai.copilotUnavailable,
      rate_limited: dict.ai.copilotRateLimited,
      timeout: dict.ai.copilotTimeout,
      too_many_tool_calls: dict.ai.copilotErrorGeneric,
    };
    return { error: messages[result.error] };
  }
  if (!result.reply) return { error: dict.ai.copilotErrorGeneric };
  return { reply: result.reply, toolsUsed: result.toolsUsed };
}
