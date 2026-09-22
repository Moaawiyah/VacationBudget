/**
 * Provider-agnostic AI failures, each saying whether a retry could help.
 * Mirrors receipt-service's app/llm/errors.py — same shape, ported to
 * TypeScript, so retry policy (retrying-provider.ts) never depends on which
 * vendor is behind the AIProvider interface.
 */
export class AIError extends Error {
  readonly retryable: boolean = false;
}

/** The provider didn't answer in time — the next attempt may. */
export class AITimeout extends AIError {
  override readonly retryable = true;
}

/** A 5xx or a dropped connection: a transient provider-side failure. */
export class AIUnavailable extends AIError {
  override readonly retryable = true;
}

/** HTTP 429. `retryAfter` is the provider's own hint, in seconds. */
export class AIRateLimited extends AIError {
  override readonly retryable = true;
  constructor(
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

/** Any other 4xx — bad key, unknown model, malformed request. Retrying the
 * identical request would get the identical answer, so it never is. */
export class AIRejected extends AIError {}
