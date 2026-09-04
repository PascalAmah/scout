"""Structured LLM helper shared by worker tasks.

Single generic OpenAI-compatible client built from ``tasks.ai_config`` — set
``AI_PROVIDER`` + ``AI_API_KEY`` and every call here targets that provider
(OpenAI, Gemini, DeepSeek, Groq, OpenRouter, Ollama, ...). Structured calls use
``chat.completions`` with ``json_object`` output, and return ``None`` on any
failure (no key, network error, invalid JSON) so callers fall back to a
deterministic path. Higher-reasoning tasks (match re-rank, generation) default
to the configured model and can be overridden with ``SCOUT_RERANK_MODEL`` /
``SCOUT_GEN_MODEL``.
"""

import json
import os
from typing import Any

from tasks.ai_config import chat_config

RERANK_MODEL = os.getenv("SCOUT_RERANK_MODEL") or chat_config()["model"]
GEN_MODEL = os.getenv("SCOUT_GEN_MODEL") or chat_config()["model"]


def _client():
    from openai import OpenAI

    cfg = chat_config()
    kwargs = {"api_key": cfg["api_key"]}
    if cfg["base_url"]:
        kwargs["base_url"] = cfg["base_url"]
    return OpenAI(**kwargs)


def resolve_model(model: str | None) -> str:
    """Return ``model`` if given, else the env ``AI_MODEL`` / provider default."""
    if model:
        return model
    return os.getenv("AI_MODEL") or chat_config()["model"]


def _messages(instructions: str, input_text: str) -> list[dict]:
    return [
        {"role": "system", "content": instructions},
        {"role": "user", "content": input_text[:12000]},
    ]


def structured_call(instructions: str, input_text: str, model: str | None = None) -> dict[str, Any] | None:
    """LLM-first structured call: returns a parsed JSON object, or None on any
    failure (no key, network error, invalid JSON) so callers degrade gracefully."""
    if not chat_config()["api_key"]:
        return None
    try:
        resp = _client().chat.completions.create(
            model=resolve_model(model),
            messages=_messages(instructions, input_text),
            response_format={"type": "json_object"},
        )
        content = resp.choices[0].message.content or "{}"
        payload = json.loads(content)
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def text_call(instructions: str, input_text: str, model: str | None = None) -> str | None:
    """LLM-first free-text call for message generation, or None on failure."""
    if not chat_config()["api_key"]:
        return None
    try:
        resp = _client().chat.completions.create(
            model=resolve_model(model),
            messages=_messages(instructions, input_text),
        )
        text = (resp.choices[0].message.content or "").strip()
        return text or None
    except Exception:
        return None
