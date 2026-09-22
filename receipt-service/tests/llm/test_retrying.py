import asyncio

import pytest

from app.llm.errors import LLMRateLimited, LLMRejected, LLMTimeout, LLMUnavailable
from app.llm.provider import LLMProvider
from app.llm.retrying import RetryingProvider


class Scripted(LLMProvider):
    """Raises the scripted errors in order, then succeeds."""

    def __init__(self, *outcomes: Exception | str) -> None:
        self.outcomes = list(outcomes)
        self.calls = 0

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        self.calls += 1
        outcome = self.outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0
        self.slept: list[float] = []

    def __call__(self) -> float:
        return self.now

    async def sleep(self, seconds: float) -> None:
        self.slept.append(seconds)
        self.now += seconds


def _retrying(inner: LLMProvider, clock: FakeClock, **kwargs) -> RetryingProvider:
    return RetryingProvider(
        inner, sleep=clock.sleep, clock=clock, jitter=lambda: 1.0, **kwargs
    )


async def test_retries_transient_failures_with_exponential_backoff():
    clock = FakeClock()
    inner = Scripted(LLMTimeout("t"), LLMUnavailable("u"), "ok")
    assert await _retrying(inner, clock).complete("s", "u") == "ok"
    assert inner.calls == 3
    assert clock.slept == [0.5, 1.0]  # base 0.5, doubling; jitter pinned high


async def test_never_retries_a_rejected_request():
    clock = FakeClock()
    inner = Scripted(LLMRejected("bad key"), "never reached")
    with pytest.raises(LLMRejected):
        await _retrying(inner, clock).complete("s", "u")
    assert inner.calls == 1


async def test_gives_up_after_max_attempts():
    clock = FakeClock()
    inner = Scripted(*(LLMUnavailable("u") for _ in range(5)))
    with pytest.raises(LLMUnavailable):
        await _retrying(inner, clock, max_attempts=3).complete("s", "u")
    assert inner.calls == 3


async def test_honors_retry_after_on_429():
    clock = FakeClock()
    inner = Scripted(LLMRateLimited("slow down", retry_after=2.0), "ok")
    assert await _retrying(inner, clock).complete("s", "u") == "ok"
    assert clock.slept == [2.0]


async def test_gives_up_when_retry_after_exceeds_patience():
    clock = FakeClock()
    inner = Scripted(LLMRateLimited("come back later", retry_after=60.0), "ok")
    with pytest.raises(LLMRateLimited):
        await _retrying(inner, clock, max_delay=8.0).complete("s", "u")
    assert inner.calls == 1


async def test_does_not_start_an_attempt_past_the_deadline():
    clock = FakeClock()

    class SlowFailure(LLMProvider):
        calls = 0

        async def complete(self, system_prompt: str, user_prompt: str) -> str:
            self.calls += 1
            clock.now += 44.9  # this attempt used almost the whole budget
            raise LLMUnavailable("u")

    inner = SlowFailure()
    with pytest.raises(LLMUnavailable):
        await _retrying(inner, clock, deadline=45.0).complete("s", "u")
    assert inner.calls == 1
    assert clock.slept == []


async def test_deadline_bounds_a_hanging_attempt():
    class Hangs(LLMProvider):
        async def complete(self, system_prompt: str, user_prompt: str) -> str:
            await asyncio.sleep(10)
            return "too late"

    with pytest.raises(LLMTimeout):
        await RetryingProvider(Hangs(), deadline=0.05).complete("s", "u")
