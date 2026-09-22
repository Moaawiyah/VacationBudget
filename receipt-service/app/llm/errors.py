"""Provider-agnostic LLM failures, each saying whether a retry could help.

Providers translate their own transport errors into these, so retry policy
(app.llm.retrying) and the API's error mapping never depend on which vendor
is behind the LLMProvider interface.
"""


class LLMError(RuntimeError):
    """Base class. `retryable` is False unless a subclass says otherwise."""

    retryable = False


class LLMTimeout(LLMError):
    """The provider didn't answer in time — the next attempt may."""

    retryable = True


class LLMUnavailable(LLMError):
    """A 5xx or a dropped connection: a transient provider-side failure."""

    retryable = True


class LLMRateLimited(LLMError):
    """HTTP 429. `retry_after` is the provider's own hint, in seconds."""

    retryable = True

    def __init__(self, message: str, retry_after: float | None = None) -> None:
        super().__init__(message)
        self.retry_after = retry_after


class LLMRejected(LLMError):
    """Any other 4xx — bad key, unknown model, malformed request. Retrying
    the identical request would get the identical answer, so it never is."""
