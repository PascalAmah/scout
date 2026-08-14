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
- ``EMBEDDING_DIM``          vector dimension (default 1536 — must match the DB column)
"""

import os

DEFAULT_PROVIDER = "openai"

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
        "model": "gemini-2.5-flash",
        # gemini-embedding-001 outputs 3072 dims — requires EMBEDDING_DIM +
        # a pgvector column migration before use.
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
    return {
        "provider": provider,
        "api_key": os.getenv("AI_API_KEY") or os.getenv("OPENAI_API_KEY") or "",
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
    return {
        "provider": provider,
        "api_key": (
            os.getenv("AI_EMBEDDING_API_KEY")
            or os.getenv("AI_API_KEY")
            or os.getenv("OPENAI_API_KEY")
            or ""
        ),
        "base_url": os.getenv("AI_BASE_URL") or spec["base_url"],
        "model": embedding_model,
    }
