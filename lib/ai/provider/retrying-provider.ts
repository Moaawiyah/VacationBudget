import { AIError, AIRateLimited, AITimeout } from "./errors";
import type { AIProvider, ChatMessage, ChatOptions, ChatResult } from "./types";

/**
 * Bounded retries for any AIProvider, applied by composition — port of
 * receipt-service's app/llm/retrying.py. Only failures that declare
 * themselves `retryable` are retried; a rejection (bad key, unknown model)
 * is thrown on the first attempt. An overall deadline bounds total time
 * spent, not just each attempt's own timeout, so the caller (a Server
 * Action or Route Handler with its own request timeout) never waits on a
 * retry past the point anyone is still listening.
 */
export class RetryingProvider implements AIProvider {
  constructor(
    private readonly inner: AIProvider,
    private readonly maxAttempts = 3,
    private readonly baseDelayMs = 500,
    private readonly maxDelayMs = 4000,
    private readonly deadlineMs = 20_000,
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
    private readonly clock: () => number = () => Date.now(),
    private readonly jitter: () => number = Math.random,
  ) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    const started = this.clock();
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await this.inner.chat(messages, options);
      } catch (error) {
        if (!(error instanceof AIError) || !error.retryable || attempt === this.maxAttempts) {
          throw error;
        }
        const delay = this.delayFor(attempt, error);
        if (delay === null || this.clock() - started + delay > this.deadlineMs) {
          throw error;
        }
        await this.sleep(delay);
      }
    }
    throw new AITimeout("unreachable"); // maxAttempts >= 1 guarantees a return or throw above
  }

  private delayFor(attempt: number, error: AIError): number | null {
    if (error instanceof AIRateLimited && error.retryAfter !== undefined) {
      return error.retryAfter * 1000 <= this.maxDelayMs ? error.retryAfter * 1000 : null;
    }
    const backoff = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** (attempt - 1));
    // Full-range jitter on the upper half, so parallel requests that failed
    // together don't all retry in lockstep.
    return backoff * (0.5 + this.jitter() / 2);
  }
}
