"""AI provider config — one env block, any OpenAI-compatible provider.

Pick a provider with ``AI_PROVIDER`` and drop in an API key. Every AI call in
the worker talks the OpenAI ``chat.completions`` wire format, so any
OpenAI-compatible endpoint (OpenAI, Gemini via Google AI Studio, DeepSeek,
Groq, OpenRouter, Ollama, vLLM, Azure, ...) works without code changes.

Env contract (all optional):

- ``AI_PROVIDER``            provider id from the registry below (default "openai")
- ``AI_API_KEY``             your key; falls back to legacy ``OPENAI_API_KEY``
- ``AI_MODEL``               override the provider's default chat model
- ``AI_BASE_URL``            override the provider's base URL (custom proxies)

Embeddings are configurable independently, since not every provider offers an
embedding API (e.g. DeepSeek). When the embedding provider has no key or no
embedding model, the worker degrades to deterministic pseudo-vectors:

- ``AI_EMBEDDING_PROVIDER``  default: the chat provider, if it supports embeddings
- ``AI_EMBEDDING_API_KEY``   default: the chat API key
- ``EMBEDDING_MODEL``        legacy override; default per provider
- ``EMBEDDING_DIM``          vector dimension (default 3072 — must match the DB column)
"""

import logging
import os
import re
from pathlib import Path

from dotenv import load_dotenv

logger = logging.getLogger(__name__)

# Load config before any env read. Precedence (highest wins):
#   1. already-set environment variables
#   2. apps/worker/.env       (worker-local overrides)
#   3. repo-root .env         (canonical shared config: AI, DB, Redis, auth)
# A later load_dotenv never overrides an earlier value. This mirrors
# apps/api/app/config.py so tasks imported outside the celery entrypoint
# (tests, scripts) resolve the same keys as the running worker.
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEFAULT_PROVIDER = "openai"

# Unfilled key templates (e.g. copied from .env.example) must be treated as
# unset, not sent to the provider — same guard as the API.
_PLACEHOLDER_RE = re.compile(r"^(your|placeholder|change[-_]?me|xxx+|sk-your)", re.IGNORECASE)


def _looks_like_placeholder(value: str) -> bool:
    """True when a key value is an unfilled template rather than a real key."""
    v = (value or "").strip()
    if not v:
        return True
    return bool(_PLACEHOLDER_RE.match(v))

# Registry of OpenAI-compatible providers. ``base_url`` is the chat.completions
# endpoint; ``model`` is the default chat model; ``embedding_model`` is None
# when the provider exposes no embedding API.
PROVIDERS: dict[str, dict] = {
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
        "embedding_model": "text-embedding-3-large",
    },
    "gemini": {
        "base_url": "https://generativelanguage.googleapis.com/v1beta/openai",
        "model": "gemini-flash-latest",
        "embedding_model": "gemini-embedding-001",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
        "embedding_model": None,
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
        "embedding_model": "text-embedding-all-minilm-l6-v2",
    },
    "openrouter": {
        "base_url": "https://openrouter.ai/api/v1",
        "model": "openrouter/auto",
        "embedding_model": None,
    },
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "model": "llama3.2",
        "embedding_model": None,
    },
}


def _spec(provider: str) -> dict:
    spec = PROVIDERS.get(provider)
    if spec is None:
        return PROVIDERS[DEFAULT_PROVIDER]
    return spec


def chat_config() -> dict:
    """Return the resolved chat client config ``{provider, api_key, base_url, model}``."""
    provider = os.getenv("AI_PROVIDER", DEFAULT_PROVIDER)
    spec = _spec(provider)
    api_key = os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
    if _looks_like_placeholder(api_key):
        logger.warning(
            "AI_API_KEY looks like an unfilled placeholder (%r); treating it as unset — "
            "LLM tasks will fall back to deterministic heuristics.",
            api_key[:24],
        )
        api_key = ""
    return {
        "provider": provider,
        "api_key": api_key,
        "base_url": os.getenv("AI_BASE_URL") or spec["base_url"],
        "model": os.getenv("AI_MODEL") or spec["model"],
    }


def embedding_config() -> dict | None:
    """Return resolved embedding config, or None when unavailable/unsupported.

    None means "no embedding API": callers must fall back to the deterministic
    pseudo-vector path.
    """
    provider = os.getenv("AI_EMBEDDING_PROVIDER") or os.getenv("AI_PROVIDER") or DEFAULT_PROVIDER
    spec = _spec(provider)
    embedding_model = os.getenv("EMBEDDING_MODEL") or spec["embedding_model"]
    if embedding_model is None:
        return None
    api_key = (
        os.getenv("AI_EMBEDDING_API_KEY")
        or os.getenv("AI_API_KEY")
        or os.getenv("OPENAI_API_KEY")
        or ""
    )
    if _looks_like_placeholder(api_key):
        return None
    return {
        "provider": provider,
        "api_key": api_key,
        "base_url": os.getenv("AI_BASE_URL") or spec["base_url"],
        "model": embedding_model,
    }
