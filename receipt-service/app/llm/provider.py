"""Abstraction over chat-completion LLM providers used for receipt extraction.

Keeping this behind an interface — rather than calling Groq's API directly
from the extraction/prompt logic — is what makes Groq a swappable
implementation instead of something baked into the rest of the app.
"""

from abc import ABC, abstractmethod


class LLMProvider(ABC):
    @abstractmethod
    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        """Returns the raw text completion for a single-turn chat request."""
