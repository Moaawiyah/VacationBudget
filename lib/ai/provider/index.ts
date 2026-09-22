import { logger } from "@/lib/logger";
import { GroqProvider } from "./groq-provider";
import { RetryingProvider } from "./retrying-provider";
import type { AIProvider } from "./types";

export type { AIProvider, ChatMessage, ChatOptions, ChatResult, ToolCall, ToolDefinition } from "./types";
export { AIError, AIRateLimited, AIRejected, AITimeout, AIUnavailable } from "./errors";

/**
 * The app's one AI provider, env-configured — same GROQ_* naming
 * receipt-service uses (a separate deployment, so this app needs its own
 * copy of the env vars; see .env.example). Returns null when unconfigured,
 * so every caller has an explicit "AI is unavailable" branch instead of a
 * thrown error — the rest of the app must keep working either way.
 */
export function getAIProvider(): AIProvider | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    logger.warn("ai.provider unavailable", { reason: "GROQ_API_KEY not configured" });
    return null;
  }
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
  const baseUrl = process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1";
  const timeoutMs = Number(process.env.GROQ_TIMEOUT_MS) || 20_000;
  return new RetryingProvider(new GroqProvider(apiKey, model, baseUrl, timeoutMs));
}
