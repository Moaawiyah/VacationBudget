"""Bounded retries for any LLMProvider, applied by composition.

Wrapping the provider (rather than building retries into GroqProvider) keeps
the policy in one place for every vendor. Only failures that declare
themselves `retryable` are retried; a rejection (bad key, unknown model) is
raised on the first attempt.

There's an overall deadline as well as an attempt cap: the Next.js caller
gives up after 60s, so retrying past that point would spend a paid request
on an answer nobody is still waiting for.
"""

import asyncio
import random
import time
from collections.abc import Awaitable, Callable

from app.llm.errors import LLMError, LLMRateLimited, LLMTimeout
from app.llm.provider import LLMProvider


class RetryingProvider(LLMProvider):
    def __init__(
        self,
        inner: LLMProvider,
        max_attempts: int = 3,
        base_delay: float = 0.5,
        max_delay: float = 8.0,
        deadline: float = 45.0,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        clock: Callable[[], float] = time.monotonic,
        jitter: Callable[[], float] = random.random,
    ) -> None:
        self._inner = inner
        self._max_attempts = max_attempts
        self._base_delay = base_delay
        self._max_delay = max_delay
        self._deadline = deadline
        self._sleep = sleep
        self._clock = clock
        self._jitter = jitter

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        started = self._clock()
        for attempt in range(1, self._max_attempts + 1):
            remaining = self._deadline - (self._clock() - started)
            try:
                # The deadline bounds each attempt's *duration*, not just
                # whether it starts: otherwise a second attempt begun at 30s
                # with a 30s timeout would outlive the caller.
                return await asyncio.wait_for(
                    self._inner.complete(system_prompt, user_prompt), timeout=remaining
                )
            except TimeoutError as exc:
                raise LLMTimeout(f"LLM deadline of {self._deadline}s exhausted") from exc
            except LLMError as exc:
                if not exc.retryable or attempt == self._max_attempts:
                    raise
                delay = self._delay_for(attempt, exc)
                # delay is None when the provider asked for more patience
                # than we have; starting a request we'd abandon is waste.
                if delay is None or self._clock() - started + delay > self._deadline:
                    raise
                await self._sleep(delay)
        raise AssertionError("unreachable: the loop returns or raises")

    def _delay_for(self, attempt: int, exc: LLMError) -> float | None:
        if isinstance(exc, LLMRateLimited) and exc.retry_after is not None:
            return exc.retry_after if exc.retry_after <= self._max_delay else None
        backoff = min(self._max_delay, self._base_delay * 2 ** (attempt - 1))
        # Full-range jitter on the upper half, so parallel requests that
        # failed together don't all retry in lockstep.
        return backoff * (0.5 + self._jitter() / 2)
