"""Embedding helpers — configurable provider with a deterministic offline fallback.

The client is built from ``tasks.ai_config`` (``AI_EMBEDDING_PROVIDER`` /
``AI_EMBEDDING_API_KEY``), so embeddings can run on a different provider than
chat (e.g. Gemini free while reasoning runs on DeepSeek). The fallback is a
unit-norm bag-of-ngram hash vector: it is cheap, stable, and comparable without
an API key, so the save → embed → match loop runs end to end headlessly. When a
key is configured we use the real model, otherwise the fallback.
"""

import hashlib
import logging
import math
import os
import re

from tasks.ai_config import embedding_config

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "3072"))

_MAX_INPUT_CHARS = 8000


def pseudo_embedding(text: str, dim: int = EMBEDDING_DIM) -> list[float]:
    """Deterministic single-word + bigram hashing → unit vector."""
    tokens = re.findall(r"[a-z0-9]+", (text or "").lower())
    vec = [0.0] * dim
    for i, token in enumerate(tokens):
        parts = [token]
        if i + 1 < len(tokens):
            parts.append(f"{token} {tokens[i + 1]}")
        for part in parts:
            digest = hashlib.blake2b(part.encode("utf-8"), digest_size=4).digest()
            vec[int.from_bytes(digest, "big") % dim] += 1.0
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _embedding_client():
    from openai import OpenAI

    cfg = embedding_config()
    kwargs = {"api_key": cfg["api_key"]}
    if cfg["base_url"]:
        kwargs["base_url"] = cfg["base_url"]
    return OpenAI(**kwargs)


def embed_text(text: str, model: str | None = None, dim: int = EMBEDDING_DIM) -> tuple[list[float], str]:
    """Return ``(vector, model_label)``. Never raises — degraded to the fallback
    when no embedding provider/key is configured or it errors, so enqueue-and-
    forget embed steps can't wedge the pipeline. Partial-failure isolation
    happens at the caller level."""
    cfg = embedding_config()
    if cfg is not None and cfg["api_key"]:
        try:
            client = _embedding_client()
            prompt = (text or "")[:_MAX_INPUT_CHARS]
            if prompt.strip():
                resp = client.embeddings.create(
                    model=model or cfg["model"],
                    input=[prompt],
                    dimensions=dim,
                )
                used = model or cfg["model"]
                return list(resp.data[0].embedding), f"{cfg['provider']}:{used}"
        except Exception as exc:  # pragma: no cover - depends on external service
            logger.warning("Embedding provider failed (%s); using fallback", exc)

    return pseudo_embedding(text or "", dim), f"fallback:{dim}"