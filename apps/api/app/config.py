import logging
import re
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)

# Load config before Settings() reads env vars. Precedence (highest wins):
#   1. already-set environment variables
#   2. apps/api/.env           (api-local overrides)
#   3. repo-root .env          (canonical shared config: AI, DB, Redis, auth)
# A later load_dotenv never overrides an earlier value. The API needs the AI
# provider/key for request-time embedding (hybrid search / assistant), which
# lives in the shared root .env.
load_dotenv(Path(__file__).resolve().parents[3] / ".env")
load_dotenv(Path(__file__).resolve().parents[1] / ".env")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"
    app_name: str = "Scout API"

    # Browser origins allowed to call the API (JSON list in .env, e.g.
    # CORS_ORIGINS=["http://localhost:5173","https://scout.app"]).
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:5173"])

    database_url: str = "postgresql+psycopg://scout:scout@127.0.0.1:5432/scout"
    redis_url: str = "redis://127.0.0.1:6379/0"

    jwt_access_secret: str = "dev-only-access-secret-change-me-please-32b"
    jwt_refresh_secret: str = "dev-only-refresh-secret-change-me-please-32b"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30

    rate_limit_disabled: bool = False

    file_store_dir: str = "data/files"

    follow_up_days: int = 5

    sendlib_api_key: str = ""
    sendlib_api_url: str = "https://sendlib.samueltuoyo.com/api/send"
    email_from: str = "Scout <hello@yourdomain.com>"
    web_app_url: str = "http://localhost:5173"

    # --- Phase 2: embeddings (consumed by the worker, not the API runtime) ---
    openai_api_key: str = ""
    embedding_model: str = "gemini-embedding-001"
    embedding_dim: int = 3072

    # --- AI provider (OpenAI-compatible) for request-time embedding ---
    # Mirrors apps/worker/tasks/ai_config.py so the API embeds search queries
    # with the same provider/model the worker used to build startup_embeddings.
    ai_provider: str = "openai"
    ai_api_key: str = ""
    ai_base_url: str = ""
    ai_model: str = ""
    ai_embedding_provider: str = ""
    ai_embedding_api_key: str = ""

    # Assistant system prompt selection: "v1" | "v2" | path-to-file (empty = v2).
    assistant_prompt: str = ""


settings = Settings()


# OpenAI-compatible provider registry — mirrors apps/worker/tasks/ai_config.py
# so the API resolves the correct base_url/model for the configured provider
# (e.g. Gemini's endpoint, not OpenAI's) for request-time chat (assistant) and
# embeddings (hybrid search).
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
        "model": "openai/gpt-oss-20b",
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

_DEFAULT_PROVIDER = "openai"


def _provider_spec(provider: str) -> dict:
    return PROVIDERS.get(provider) or PROVIDERS[_DEFAULT_PROVIDER]


# Unfilled key templates (e.g. copied from .env.example) must be treated as
# unset, not sent to the provider as a real key. The most common trap: an
# env var like AI_API_KEY=YOUR_GEMINI_API_KEY_HERE exported in the shell
# shadows the real key in the repo-root .env (env vars win in load order).
_PLACEHOLDER_RE = re.compile(r"^(your|placeholder|change[-_]?me|xxx+|sk-your)", re.IGNORECASE)


def _looks_like_placeholder(value: str) -> bool:
    """True when a key value is an unfilled template rather than a real key."""
    v = (value or "").strip()
    if not v:
        return True
    return bool(_PLACEHOLDER_RE.match(v))


def resolve_chat_config() -> dict:
    """Resolve ``{provider, api_key, base_url, model}`` for chat calls."""
    provider = settings.ai_provider or _DEFAULT_PROVIDER
    spec = _provider_spec(provider)
    api_key = settings.ai_api_key
    if _looks_like_placeholder(api_key):
        logger.warning(
            "AI_API_KEY looks like an unfilled placeholder (%r); treating it as unset. "
            "Set a real key in the repo-root .env or unset the AI_API_KEY env var.",
            api_key[:24],
        )
        api_key = ""
    return {
        "provider": provider,
        "api_key": api_key,
        "base_url": settings.ai_base_url or spec["base_url"],
        "model": settings.ai_model or spec["model"],
    }


def resolve_embedding_config() -> dict | None:
    """Resolve the embedding config, or None when no usable key is configured."""
    provider = settings.ai_embedding_provider or settings.ai_provider or _DEFAULT_PROVIDER
    api_key = settings.ai_embedding_api_key or settings.ai_api_key
    if _looks_like_placeholder(api_key):
        return None
    spec = _provider_spec(provider)
    return {
        "provider": provider,
        "api_key": api_key,
        "base_url": settings.ai_base_url or spec["base_url"],
        "model": settings.embedding_model,
    }
